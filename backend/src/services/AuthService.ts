import bcrypt from "bcryptjs";
import { User, IUser, UserRole } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { generateToken, AuthenticatedUser } from "../middleware/auth.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";
import { mailService } from "./MailService.js";

@Singleton
export class AuthService {
  @LogExecution
  @ValidateInput
  async registerCustomer(name: string, email: string, password: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error("Email address is already registered.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "customer",
      status: "active",
    });

    const authenticatedUser: AuthenticatedUser = {
      userId: String(newUser._id),
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    };

    // Asynchronously dispatch welcome email via Nodemailer
    mailService.sendWelcomeEmail(name, email.toLowerCase()).catch((err) => {
      console.warn("⚠️ Welcome email dispatch failed:", err.message);
    });

    const token = generateToken(authenticatedUser);
    return { user: authenticatedUser, token };
  }

  /**
   * Sends a password-reset OTP email. Returns the OTP for demo purposes
   * (in production you'd store a hashed OTP in the DB instead).
   */
  @LogExecution
  @ValidateInput
  async forgotPassword(email: string): Promise<{ otp: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success anyway to avoid email enumeration
      return { otp: "" };
    }

    // 6-digit OTP valid for 15 minutes
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // Store OTP + expiry on user document
    user.set("passwordResetOtp", otp);
    user.set("passwordResetExpiry", expiry);
    await user.save();

    await mailService.sendPasswordResetEmail(user.name, email.toLowerCase(), otp);
    return { otp }; // Returned so mobile can show it in demo mode
  }

  /**
   * Verifies OTP and sets a new password.
   */
  @LogExecution
  @ValidateInput
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("No account found with that email address.");

    const storedOtp = (user as any).passwordResetOtp;
    const expiry: Date = (user as any).passwordResetExpiry;

    if (!storedOtp || storedOtp !== otp) {
      throw new Error("Invalid OTP. Please request a new one.");
    }
    if (!expiry || new Date() > expiry) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.set("passwordResetOtp", undefined);
    user.set("passwordResetExpiry", undefined);
    await user.save();
  }

  /**
   * Updates the calling user's profile (name, phone, dietary preferences).
   */
  @LogExecution
  async updateProfile(
    userId: string,
    updates: { name?: string; phone?: string; dietaryPreferences?: { allergens?: string[]; diet?: string[] } }
  ): Promise<{ name: string; email: string; role: string; phone: string; dietaryPreferences: { allergens: string[]; diet: string[] }; bountyPoints: number; bountyWalletBalance: number }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (updates.name && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.phone !== undefined) {
      user.phone = updates.phone.trim();
    }
    if (updates.dietaryPreferences) {
      user.dietaryPreferences = {
        allergens: updates.dietaryPreferences.allergens ?? user.dietaryPreferences?.allergens ?? [],
        diet: updates.dietaryPreferences.diet ?? user.dietaryPreferences?.diet ?? [],
      };
    }

    await user.save();

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      dietaryPreferences: user.dietaryPreferences || { allergens: [], diet: [] },
      bountyPoints: user.bountyPoints,
      bountyWalletBalance: user.bountyWalletBalance,
    };
  }

  /**
   * Returns the full profile for the calling user (including bounty fields).
   */
  @LogExecution
  async getProfile(userId: string): Promise<{ name: string; email: string; role: string; phone: string; dietaryPreferences: { allergens: string[]; diet: string[] }; bountyPoints: number; bountyWalletBalance: number }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      dietaryPreferences: user.dietaryPreferences || { allergens: [], diet: [] },
      bountyPoints: user.bountyPoints,
      bountyWalletBalance: user.bountyWalletBalance,
    };
  }

  /**
   * Redeems bounty points for wallet credit. Each redeemed point removes 1 point
   * and ₹0.50 from the wallet balance. Validates the user has enough.
   */
  @LogExecution
  async redeemBounty(
    userId: string,
    pointsToRedeem: number
  ): Promise<{ bountyPoints: number; bountyWalletBalance: number; redeemed: number; walletDebit: number }> {
    if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
      throw new Error("Points to redeem must be a positive integer.");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (user.bountyPoints < pointsToRedeem) {
      throw new Error(
        `Insufficient Fresh Points. You have ${user.bountyPoints} points but tried to redeem ${pointsToRedeem}.`
      );
    }

    const walletDebit = Number((pointsToRedeem * 0.5).toFixed(2));

    user.bountyPoints -= pointsToRedeem;
    user.bountyWalletBalance = Math.max(0, Number((user.bountyWalletBalance - walletDebit).toFixed(2)));
    await user.save();

    await AuditLog.create({
      actorId: userId,
      actorRole: user.role,
      action: "BOUNTY_REDEEMED",
      targetType: "User",
      targetId: userId,
      details: `Redeemed ${pointsToRedeem} Fresh Points for ₹${walletDebit} wallet credit`,
    });

    return {
      bountyPoints: user.bountyPoints,
      bountyWalletBalance: user.bountyWalletBalance,
      redeemed: pointsToRedeem,
      walletDebit,
    };
  }

  @LogExecution
  @ValidateInput
  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("Invalid credentials email or password.");
    }

    if (user.status === "disabled") {
      throw new Error("Account has been disabled. Contact store administrator.");
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials email or password.");
    }

    const authenticatedUser: AuthenticatedUser = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = generateToken(authenticatedUser);
    return { user: authenticatedUser, token };
  }

  async seedDefaultAccounts(): Promise<void> {
    // NODE_ENV=production no longer blocks seeding so Docker deployments work correctly.

    const adminExists = await User.findOne({ email: "admin@freshmart.com" });
    if (!adminExists) {
      const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
      if (adminPassword) {
        const adminHash = await bcrypt.hash(adminPassword, 10);
        await User.create({
          name: "Store Administrator",
          email: "admin@freshmart.com",
          passwordHash: adminHash,
          role: "admin",
          status: "active",
        });
        console.log("Development admin account seeded: admin@freshmart.com");
      } else {
        console.warn("Skipping development admin account; set DEMO_ADMIN_PASSWORD to enable it.");
      }
    }

    const workerExists = await User.findOne({ email: "worker@freshmart.com" });
    if (!workerExists) {
      const workerPassword = process.env.DEMO_WORKER_PASSWORD;
      if (workerPassword) {
        const workerHash = await bcrypt.hash(workerPassword, 10);
        await User.create({
          name: "Demo Worker Terminal",
          email: "worker@freshmart.com",
          passwordHash: workerHash,
          role: "worker",
          status: "active",
        });
        console.log("Development worker account seeded: worker@freshmart.com");
      } else {
        console.warn("Skipping development worker account; set DEMO_WORKER_PASSWORD to enable it.");
      }
    }
  }
}

export const authService = new AuthService();
