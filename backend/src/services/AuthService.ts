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
    if (process.env.NODE_ENV === "production") {
      console.log("Default development accounts are disabled in production.");
      return;
    }

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
