import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { dbStore } from '../../database/store';

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async send(params: {
    userId: string;
    projectId?: string;
    type: string;
    title: string;
    body: string;
    userEmail?: string;
  }) {
    // 1. Create In-App Notification
    const notif = dbStore.addNotification({
      userId: params.userId,
      projectId: params.projectId,
      type: params.type,
      title: params.title,
      body: params.body,
    });

    // 2. Send transactional email if email address and transporter are available
    if (this.transporter && params.userEmail) {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to: params.userEmail,
          subject: `Clausora: ${params.title}`,
          text: `${params.body}\n\nView details in Clausora: ${env.APP_BASE_URL}`,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2 style="color: #6366F1;">Clausora Work Intelligence</h2>
            <p><strong>${params.title}</strong></p>
            <p>${params.body}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <a href="${env.APP_BASE_URL}" style="background: #6366F1; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block;">Open Clausora</a>
          </div>`,
        });
      } catch (err) {
        console.warn('⚠️ Transactional email delivery failed:', (err as Error).message);
      }
    } else {
      // In development or demo mode, log the notification
      console.log(`📨 [Notification Logged] ${params.title} -> User ${params.userId}: ${params.body}`);
    }

    return notif;
  }
}

export const notificationService = new NotificationService();

