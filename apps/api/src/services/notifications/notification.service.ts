import { env } from '../../config/env';
import { dbStore } from '../../database/store';
import { emailService } from '../email/email.service';

export class NotificationService {
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

    // 2. Resolve recipient email if not directly provided
    let recipientEmail = params.userEmail;
    let recipientName = 'Clausora Member';
    if (!recipientEmail && params.userId) {
      const user = dbStore.users.get(params.userId);
      if (user?.email) {
        recipientEmail = user.email;
        recipientName = user.name || recipientName;
      }
    }

    // 3. Dispatch transactional email through EmailService
    if (recipientEmail) {
      const htmlContent = `
        <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #FFFFFF;">
          ${params.title}
        </h2>
        <p style="margin: 0 0 16px; font-size: 14px; color: #CBD5E1; line-height: 1.6;">
          Hello ${recipientName},
        </p>
        <div style="background-color: #1E293B; border-left: 4px solid #6366F1; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #E2E8F0; line-height: 1.6;">
            ${params.body}
          </p>
        </div>
        <p style="margin: 20px 0 0; font-size: 12px; color: #94A3B8;">
          You received this email because of an update in your Clausora workspace.
        </p>
      `;

      try {
        await emailService.sendMail({
          to: recipientEmail,
          subject: `Clausora: ${params.title}`,
          text: `Hello ${recipientName},\n\n${params.title}\n\n${params.body}\n\nClausora Work Intelligence Platform`,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F19; padding: 25px; color: #E2E8F0; border-radius: 12px;">${htmlContent}</div>`,
          type: params.type,
        });
      } catch (err: any) {
        console.warn('⚠️ Transactional email delivery error:', err.message);
      }
    } else {
      console.log(`📬 [Notification Logged] ${params.title} -> User ${params.userId}: ${params.body}`);
    }

    return notif;
  }
}

export const notificationService = new NotificationService();
