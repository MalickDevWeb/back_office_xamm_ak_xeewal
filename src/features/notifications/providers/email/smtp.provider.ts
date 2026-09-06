import * as nodemailer from 'nodemailer';
import { IEmailProvider } from '@/core/interfaces/notification-providers.interface';

export class SmtpProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(config: { host: string; port: number; secure: boolean; user: string; pass: string; from: string }) {
    this.fromEmail = config.from || '"SEN AURA TECH" <noreply@senauratech.sn>';
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: config.secure === true || String(config.secure) === 'true',
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        text,
        html: html || text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[SmtpProvider] Message sent: %s`, info.messageId);
      return true;
    } catch (error) {
      console.error('[SmtpProvider] Error sending email:', error);
      return false;
    }
  }
}
