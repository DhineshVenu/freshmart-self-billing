import bcrypt from "bcryptjs";
import { User, IUser, UserRole } from "../models/User.js";
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
    // Always seed if accounts are missing — the existence check below is the guard.
    // NODE_ENV=production no longer blocks seeding so Docker deployments work correctly.

    const adminExists = await User.findOne({ role: "admin" });
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

    const workerExists = await User.findOne({ role: "worker" });
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
