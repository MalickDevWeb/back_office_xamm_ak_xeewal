import * as nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'test-user',
        pass: process.env.SMTP_PASS || 'test-pass'
      }
    });
  }

  /**
   * Envoie un email à un destinataire
   * Retourne true si l'envoi a réussi
   */
  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"SEN AURA TECH" <noreply@senauratech.sn>',
        to,
        subject,
        text,
        html: html || text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Message sent: %s`, info.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return false;
    }
  }
}
