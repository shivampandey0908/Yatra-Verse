import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export interface EmailProvider { sendVerificationCode(input: { to: string; name: string; code: string }): Promise<void>; }
export class DevelopmentEmailProvider implements EmailProvider {
  async sendVerificationCode({ to, code }: { to: string; name: string; code: string }) { console.info(`[development only] Email verification OTP for ${to}: ${code}`); }
}
export class SmtpEmailProvider implements EmailProvider {
  private transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  async sendVerificationCode({ to, name, code }: { to: string; name: string; code: string }) { await this.transport.sendMail({ from: env.EMAIL_FROM, to, subject: "Your YATRA VERSE verification code", text: `Hello ${name},\n\nYour YATRA VERSE verification code is ${code}. It expires in 10 minutes.\n\nDo not share this code with anyone.`, html: `<p>Hello ${name},</p><p>Your YATRA VERSE verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>` }); }
}
export const emailProvider: EmailProvider = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM ? new SmtpEmailProvider() : new DevelopmentEmailProvider();
