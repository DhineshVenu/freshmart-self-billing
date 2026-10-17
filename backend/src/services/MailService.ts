import nodemailer, { Transporter } from "nodemailer";
import { IOrder } from "../models/Order.js";
import { Singleton, LogExecution } from "../utils/index.js";

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  recipient: string;
  error?: string;
}

@Singleton
export class MailService {
  private transporter: Transporter | null = null;
  private isInitializing: Promise<void> | null = null;

  constructor() {
    this.initTransporter().catch((err) => {
      console.warn("⚠️ Initial Mail transporter setup deferred:", err.message);
    });
  }

  /**
   * Initializes or returns the cached nodemailer transporter.
   * If real SMTP credentials (SMTP_USER, SMTP_PASS) are provided in .env, it uses them.
   * Otherwise in development, it generates an Ethereal test account automatically.
   */
  private async initTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.isInitializing) {
      await this.isInitializing;
      if (this.transporter) return this.transporter;
    }

    this.isInitializing = (async () => {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (user && pass) {
        // Real SMTP configuration (Gmail, SendGrid, Amazon SES, Mailgun, etc.)
        this.transporter = nodemailer.createTransport({
          host: host || "smtp.gmail.com",
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        console.log(`📧 MailService configured with SMTP account: ${user} via ${host || "smtp.gmail.com"}`);
      } else {
        // Automatic Ethereal fallback for seamless development & testing
        try {
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          console.log(`📬 MailService created Ethereal test account: ${testAccount.user}`);
        } catch (testErr) {
          console.warn("⚠️ Could not create Ethereal account (offline mode). Setting json transport fallback.");
          this.transporter = nodemailer.createTransport({
            jsonTransport: true,
          });
        }
      }
    })();

    await this.isInitializing;
    return this.transporter!;
  }

  /**
   * Generates a modern, responsive HTML Tax Invoice matching Fresh Mart POS standards.
   */
  private generateInvoiceHtml(order: IOrder): string {
    const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = new Date(order.createdAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 8px; text-align: left;">
            <div style="font-weight: 600; color: #1e293b;">${item.name}</div>
            <div style="font-size: 11px; color: #64748b;">Barcode: #${item.barcode}</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #334155;">${item.quantity}</td>
          <td style="padding: 10px 8px; text-align: right; color: #334155;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #0f172a;">₹${item.lineTotal.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fresh Mart E-Receipt - ${order.orderNo}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0;">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">FRESH MART SUPERMARKET</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${order.storeName || "Fresh Mart Store #01"} • GSTIN: 29AAAAA0000A1Z5</p>
      <div style="display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">
        OFFICIAL DIGITAL TAX INVOICE
      </div>
    </div>

    <div style="padding: 24px;">
      <!-- Customer & Invoice Meta -->
      <table style="width: 100%; margin-bottom: 20px; font-size: 13px; color: #475569;">
        <tr>
          <td style="vertical-align: top; width: 50%;">
            <p style="margin: 2px 0;"><strong>Invoice No:</strong> <span style="color: #0f172a; font-weight: 600;">${order.orderNo}</span></p>
            <p style="margin: 2px 0;"><strong>Customer:</strong> ${order.customerName}</p>
            <p style="margin: 2px 0;"><strong>Session:</strong> #${order.sessionId.slice(0, 8)}</p>
          </td>
          <td style="vertical-align: top; text-align: right; width: 50%;">
            <p style="margin: 2px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 2px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 2px 0;"><strong>Status:</strong> <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${order.status}</span></p>
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #f8fafc; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; color: #475569;">
            <th style="padding: 10px 8px; text-align: left;">Item Description</th>
            <th style="padding: 10px 8px; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; text-align: right;">Price</th>
            <th style="padding: 10px 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Price Breakdown -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #334155;">₹${order.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">GST Tax (5% included):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #334155;">₹${order.taxAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 800; color: #0f172a;">Grand Total:</td>
            <td style="padding: 10px 0 4px 0; text-align: right; font-size: 18px; font-weight: 800; color: #16a34a;">₹${order.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Paid Verification Banner -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 700; color: #15803d; margin-bottom: 4px;">
          ✓ VERIFIED & PAID via ${order.paymentMethod || "UPI"}
        </div>
        <div style="font-size: 12px; color: #166534;">
          Your digital bill has been settled and verified. Thank you for using Fresh Mart Self-Checkout!
        </div>
      </div>

      <!-- Footer Message -->
      <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">🌱 Save Paper • Go Digital</p>
        <p style="margin: 0;">This is a computer-generated tax invoice. For customer queries, contact support@freshmart.local</p>
      </div>

    </div>
  </div>
</body>
</html>
`;
  }

  /**
   * Dispatches the digital invoice email to the recipient.
   */
  @LogExecution
  public async sendInvoiceEmail(order: IOrder, recipientEmail?: string): Promise<SendMailResult> {
    const targetEmail = recipientEmail || order.customerEmail;
    if (!targetEmail || !targetEmail.trim()) {
      return {
        success: false,
        recipient: targetEmail || "Unknown",
        error: "No recipient email address provided.",
      };
    }

    try {
      const transporter = await this.initTransporter();
      const fromAddress = process.env.SMTP_FROM || `"Fresh Mart Self-Billing" <${process.env.SMTP_USER || "receipts@freshmart.local"}>`;
      const subject = `Your Fresh Mart Receipt - Invoice #${order.orderNo}`;
      const html = this.generateInvoiceHtml(order);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: targetEmail.trim(),
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`✉️ [MailService] Ethereal Preview URL: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        recipient: targetEmail.trim(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error while sending email";
      console.error(`❌ [MailService] Failed to send invoice email to ${targetEmail}:`, errMsg);
      return {
        success: false,
        recipient: targetEmail,
        error: errMsg,
      };
    }
  }

  /**
   * Sends a welcome email upon new customer registration.
   */
  @LogExecution
  public async sendWelcomeEmail(name: string, email: string): Promise<SendMailResult> {
    try {
      const transporter = await this.initTransporter();
      const fromAddress = process.env.SMTP_FROM || `"Fresh Mart Team" <${process.env.SMTP_USER || "welcome@freshmart.local"}>`;
      const subject = "Welcome to Fresh Mart Self-Billing Platform!";
      const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #16a34a;">Welcome to Fresh Mart, ${name}!</h2>
          <p>Thank you for joining our next-generation supermarket self-checkout platform.</p>
          <p>You can now simply scan barcodes in-store, manage your live cart, and get instant digital e-receipts directly in your email.</p>
          <br/>
          <p>Happy Shopping,<br/><strong>The Fresh Mart Team</strong></p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: email.trim(),
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        recipient: email.trim(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to send welcome email";
      return {
        success: false,
        recipient: email,
        error: errMsg,
      };
    }
  }

  /**
   * Sends a low-stock alert email to the admin.
   */
  @LogExecution
  public async sendLowStockAlert(
    productName: string,
    barcode: string,
    currentQty: number,
    reorderLevel: number,
    recipientEmail: string
  ): Promise<SendMailResult> {
    try {
      const transporter = await this.initTransporter();
      const fromAddress = process.env.SMTP_FROM || `"Fresh Mart Inventory Alerts" <${process.env.SMTP_USER || "alerts@freshmart.local"}>`;
      const subject = `⚠️ Low Stock Alert: ${productName}`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; color: #78350f;">
          <h2 style="color: #d97706; margin-top: 0;">📦 Low Stock Alert</h2>
          <p style="font-size: 15px; margin: 12px 0;"><strong>Product:</strong> ${productName}</p>
          <p style="font-size: 15px; margin: 12px 0;"><strong>Barcode:</strong> #${barcode}</p>
          <p style="font-size: 15px; margin: 12px 0;"><strong>Current Stock:</strong> <span style="color: #dc2626; font-weight: 700;">${currentQty} units</span></p>
          <p style="font-size: 15px; margin: 12px 0;"><strong>Reorder Threshold:</strong> ${reorderLevel} units</p>
          <hr style="border: 0; border-top: 1px solid #fbbf24; margin: 16px 0;" />
          <p style="font-size: 13px; color: #92400e;">
            This product has reached or fallen below its configured reorder level. Please restock to avoid out-of-stock situations during peak hours.
          </p>
          <p style="font-size: 13px; color: #92400e; margin-top: 16px;">
            <strong>— Fresh Mart Inventory Management System</strong>
          </p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail.trim(),
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        recipient: recipientEmail.trim(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to send low-stock alert";
      return {
        success: false,
        recipient: recipientEmail,
        error: errMsg,
      };
    }
  }
}

export const mailService = new MailService();
