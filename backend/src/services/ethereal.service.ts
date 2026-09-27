import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EtherealService {
  private transporter: nodemailer.Transporter | null = null;
  private accountInfo: { user: string; pass: string; webUrl?: string } | null = null;

  async init(): Promise<void> {
    try {
      let user = process.env.ETHEREAL_USER;
      let pass = process.env.ETHEREAL_PASS;

      if (!user || !pass) {
        console.log('🔄 Creating new Ethereal test account for SMTP sending...');
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        this.accountInfo = {
          user,
          pass,
          webUrl: 'https://ethereal.email/login',
        };
        console.log(`📧 Ethereal Account Generated: ${user}`);
        console.log(`🔗 Ethereal Web Login: https://ethereal.email/login`);
      } else {
        this.accountInfo = { user, pass };
        console.log(`📧 Using configured Ethereal Account: ${user}`);
      }

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: user,
          pass: pass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Ethereal SMTP Transporter verified and ready.');
    } catch (error: any) {
      console.error('❌ Failed to initialize Ethereal SMTP Transporter:', error?.message || error);
    }
  }

  async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string }> {
    if (!this.transporter) {
      await this.init();
      if (!this.transporter) {
        throw new Error('Ethereal Transporter could not be initialized.');
      }
    }

    const info = await this.transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #1e1b4b; margin: 0;">${params.subject}</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Sent via ReachInbox Email Job Scheduler</p>
          </div>
          <div style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
            ${params.body}
          </div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
            <p>From: <strong>${params.from}</strong></p>
            <p>To: <strong>${params.to}</strong></p>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || `https://ethereal.email/messages`;

    console.log(`✉️ Email sent to ${params.to}. MessageId: ${info.messageId}`);
    console.log(`🌐 Preview URL: ${previewUrl}`);

    return {
      messageId: info.messageId,
      previewUrl: String(previewUrl),
    };
  }

  getAccountInfo() {
    return this.accountInfo;
  }
}

export const etherealService = new EtherealService();
