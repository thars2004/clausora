import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { dbStore } from '../../database/store';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private lastError: string | null = null;

  constructor() {
    this.initTransporter();
  }

  public initTransporter(customConfig?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    secure?: boolean;
    service?: string;
  }) {
    const smtpUser = customConfig?.user || process.env.SMTP_USER || env.SMTP_USER;
    const smtpPass = customConfig?.pass || process.env.SMTP_PASS || env.SMTP_PASS;
    const smtpHost = customConfig?.host || process.env.SMTP_HOST || env.SMTP_HOST;
    const smtpPort = customConfig?.port || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : env.SMTP_PORT) || 465;
    const smtpSecure = customConfig?.secure !== undefined
      ? customConfig.secure
      : (process.env.SMTP_SECURE === 'true' || env.SMTP_SECURE || smtpPort === 465);
    const smtpService = customConfig?.service || process.env.SMTP_SERVICE || env.SMTP_SERVICE;

    const resendKey = process.env.RESEND_API_KEY || (env as any).RESEND_API_KEY;

    if (resendKey) {
      this.isConfigured = true;
      console.log('📧 [EmailService] Resend HTTPS API configured & ready for instant cloud delivery (Port 443)!');
    } else if (smtpUser && smtpPass) {
      try {
        let transportConfig: any;

        // Smart Gmail detection (either explicit service or @gmail.com user / smtp.gmail.com)
        const isGmail =
          smtpService === 'gmail' ||
          (smtpHost && smtpHost.includes('gmail')) ||
          (!smtpHost && smtpUser.includes('@gmail.com'));

        if (isGmail) {
          transportConfig = {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 4000,
            greetingTimeout: 3000,
            socketTimeout: 5000,
            tls: {
              rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
          };
        } else {
          transportConfig = {
            host: smtpHost || 'smtp.gmail.com',
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 4000,
            greetingTimeout: 3000,
            socketTimeout: 5000,
            tls: {
              rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
          };
        }

        this.transporter = nodemailer.createTransport(transportConfig);
        this.isConfigured = true;
        this.lastError = null;

        const providerLabel = isGmail ? 'Gmail Service' : `${smtpHost}:${smtpPort}`;
        console.log(`📧 [EmailService] SMTP Transporter initialized (${providerLabel} for account: ${smtpUser})`);

        // Asynchronous connectivity & credentials verification
        this.transporter.verify((err) => {
          if (err) {
            this.lastError = err.message;
            console.warn('⚠️ [EmailService] SMTP verification notice:', err.message);
          } else {
            this.lastError = null;
            console.log('✅ [EmailService] Live SMTP transport verified & ready to deliver real emails in both DEV and PROD!');
          }
        });
      } catch (err: any) {
        this.isConfigured = false;
        this.lastError = err.message;
        console.warn('⚠️ [EmailService] Failed to initialize SMTP transporter:', err.message);
      }
    } else {
      this.transporter = null;
      this.isConfigured = false;
      console.log('📧 [EmailService] Running in simulated mode (emails logged & persisted to audit store). To send live emails in dev/prod, configure SMTP_USER and SMTP_PASS in .env.');
    }
  }

  /**
   * Helper to wrap email body in official responsive Clausora HTML template
   */
  private wrapTemplate(title: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F19; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #1E1B4B; padding: 24px 30px; border-bottom: 2px solid #4F46E5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px;">
                      CLAUSORA
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #A5B4FC; font-family: monospace;">
                      AI WORK DNA &bull; VERIFIABLE MILESTONE PAYMENTS
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: bold; color: #38BDF8; background-color: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; font-family: monospace;">
                      SECURE NOTIFICATION
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 30px; color: #CBD5E1; font-size: 14px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 20px 30px; border-top: 1px solid #1E293B; text-align: center; color: #64748B; font-size: 11px;">
              <p style="margin: 0 0 6px 0;">
                Clausora Deterministic Work Execution & Escrow Settlement Platform
              </p>
              <p style="margin: 0;">
                Understand the work. Verify the outcome. Release the payment.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Generic send method with logging and persistence
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: string;
  }): Promise<{ success: boolean; logId: string }> {
    const fromAddress = env.EMAIL_FROM || 'Clausora <notifications@clausora.dev>';

    // Record email in store
    const log = dbStore.addEmailLog({
      to: options.to,
      from: fromAddress,
      subject: options.subject,
      type: options.type,
      status: this.isConfigured ? 'sent' : 'simulated',
      text: options.text,
      html: options.html,
    });

    // Re-check configuration dynamically if credentials were provided after startup
    if (!this.isConfigured && (process.env.SMTP_USER || env.SMTP_USER)) {
      this.initTransporter();
    }

    // 1. Try Resend HTTPS API first if API key is provided (never blocked by cloud host firewalls)
    const resendKey = process.env.RESEND_API_KEY || (env as any).RESEND_API_KEY;
    if (resendKey) {
      try {
        const configuredFrom = env.EMAIL_FROM || 'Clausora <notifications@clausora.dev>';
        // Resend free tier sends from onboarding@resend.dev unless custom domain is verified
        const sender = configuredFrom.includes('@resend.dev') ? configuredFrom : 'Clausora <onboarding@resend.dev>';

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sender,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        if (response.ok) {
          const resData: any = await response.json();
          console.log(`✉️ [Live Email Sent via Resend HTTPS] Delivered to ${options.to} (ID: ${resData?.id || 'ok'})`);
          log.status = 'sent';
          this.lastError = null;
          return { success: true, logId: log.id };
        } else {
          const errText = await response.text();
          console.warn(`⚠️ [Resend Delivery Failed]`, errText);
          this.lastError = `Resend error: ${errText}`;
        }
      } catch (resendErr: any) {
        console.warn('⚠️ [Resend API Error]:', resendErr.message);
        this.lastError = resendErr.message;
      }
    }

    // 2. Try Nodemailer SMTP
    if (this.transporter && this.isConfigured) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log(`✉️ [Live Email Sent] Successfully delivered to ${options.to} (MessageId: ${info.messageId || 'ok'})`);
        log.status = 'sent';
        this.lastError = null;
        return { success: true, logId: log.id };
      } catch (err: any) {
        console.warn(`⚠️ [Live Email Delivery Failed] to ${options.to}:`, err.message);
        log.status = 'failed';
        this.lastError = err.message;
      }
    }

    // In development mode, always print email details to console for instant developer feedback
    const isDev = process.env.NODE_ENV !== 'production' || env.NODE_ENV !== 'production';
    if (isDev || !this.isConfigured) {
      console.log('──────────────────────────────────────────────────────────────────────────────');
      console.log(`📧 [Email Dispatched] Mode: [${this.isConfigured ? 'LIVE_SMTP' : 'SIMULATED'}] | Status: [${log.status.toUpperCase()}]`);
      console.log(`   To:      ${options.to}`);
      console.log(`   From:    ${fromAddress}`);
      console.log(`   Subject: ${options.subject}`);
      if (log.status === 'failed' && this.lastError) {
        console.log(`   Error:   ${this.lastError}`);
      }
      console.log(`   Content: ${options.text.substring(0, 160)}...`);
      console.log('──────────────────────────────────────────────────────────────────────────────');
    }

    return { success: log.status !== 'failed', logId: log.id };
  }

  /**
   * 1. Send Password Recovery OTP
   */
  async sendPasswordResetOtp(params: {
    to: string;
    name?: string;
    otp: string;
    expiresInMinutes?: number;
  }) {
    const minutes = params.expiresInMinutes || 10;
    const recipient = params.name || 'Clausora Member';
    const subject = `Your Clausora Password Recovery Code: ${params.otp}`;

    const text = `Hello ${recipient},\n\nYou requested to reset your Clausora account password. Your 6-digit recovery OTP code is:\n\n${params.otp}\n\nThis verification code is valid for ${minutes} minutes. If you did not make this request, please disregard this email.\n\nClausora Security Team`;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #FFFFFF; font-weight: 700;">
        Password Recovery Request
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello <strong style="color: #FFFFFF;">${recipient}</strong>,
      </p>
      <p style="margin: 0 0 20px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        We received a request to reset the password for your Clausora account. Use the 6-digit verification code below to authorize your password recovery:
      </p>

      <!-- 6-Digit OTP Highlight Box -->
      <div style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); border: 2px dashed #6366F1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; font-family: monospace; letter-spacing: 2px; color: #A5B4FC; margin-bottom: 6px;">
          One-Time Password (OTP)
        </span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #FFFFFF; text-shadow: 0 0 12px rgba(99, 102, 241, 0.6);">
          ${params.otp}
        </span>
        <span style="display: block; font-size: 11px; color: #FCD34D; font-family: monospace; margin-top: 8px;">
          ⏱ Expires in ${minutes} minutes
        </span>
      </div>

      <div style="background-color: #0F172A; border-left: 3px solid #38BDF8; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          <strong style="color: #38BDF8;">Security Notice:</strong> Clausora will never ask for this code over the phone or in chat. If you did not initiate this request, you can safely disregard this message.
        </p>
      </div>
    `;

    const fullHtml = this.wrapTemplate('Password Recovery Code', htmlContent);

    return this.sendMail({
      to: params.to,
      subject,
      html: fullHtml,
      text,
      type: 'forgot_password_otp',
    });
  }

  /**
   * 2. Send Password Changed Confirmation
   */
  async sendPasswordChangedConfirmation(params: { to: string; name?: string }) {
    const recipient = params.name || 'Clausora Member';
    const subject = 'Your Clausora Password Has Been Changed';

    const text = `Hello ${recipient},\n\nThe password for your Clausora account has been successfully changed.\n\nIf you performed this change, no further action is required.\nIf you did not perform this action, please contact your platform administrator immediately.\n\nClausora Security Team`;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #10B981; font-weight: 700;">
        ✓ Password Changed Successfully
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello <strong style="color: #FFFFFF;">${recipient}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        This is a confirmation that the password for your Clausora account (<strong style="color: #FFFFFF;">${params.to}</strong>) was successfully updated.
      </p>
      <div style="background-color: #0F172A; border-left: 3px solid #10B981; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
          If you performed this change, you can now log in using your new credentials.
        </p>
      </div>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #F43F5E;">
        If you did not authorize this change, please report this incident to your administrator immediately to secure your account.
      </p>
    `;

    const fullHtml = this.wrapTemplate('Password Changed', htmlContent);

    return this.sendMail({
      to: params.to,
      subject,
      html: fullHtml,
      text,
      type: 'password_changed',
    });
  }

  /**
   * 3. Send Project Proposal Awaiting Acceptance Notification
   */
  async sendProjectProposalNotification(params: {
    to: string;
    recipientName: string;
    projectTitle: string;
    creatorName: string;
    creatorRole: string;
    projectId: string;
  }) {
    const subject = `Action Required: Project Proposal "${params.projectTitle}" Awaiting Your Acceptance`;
    const projectUrl = `${env.APP_BASE_URL}/projects/${params.projectId}`;

    const text = `Hello ${params.recipientName},\n\nA new project proposal "${params.projectTitle}" has been submitted by ${params.creatorName} (${params.creatorRole}).\n\nUnder Clausora bilateral rules, the opponent counterpart must review and activate this project before deliverables and escrow releases can proceed.\n\nReview project: ${projectUrl}\n\nClausora Platform`;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #FBBF24; font-weight: 700;">
        Project Proposal Awaiting Acceptance
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello <strong style="color: #FFFFFF;">${params.recipientName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        <strong style="color: #FFFFFF;">${params.creatorName}</strong> (${params.creatorRole}) has submitted a new project workspace proposal titled:
      </p>
      <div style="background-color: #0F172A; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #FFFFFF;">${params.projectTitle}</h3>
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">Project ID: <code style="color: #818CF8;">${params.projectId}</code></p>
      </div>
      <p style="margin: 0 0 20px 0; font-size: 13px; color: #CBD5E1;">
        Under Clausora bilateral contract integrity, project creators are prohibited from self-approval. Your review and acceptance as the assigned counterpart is required to activate this workspace.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${projectUrl}" style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Review &amp; Activate Project
        </a>
      </div>
    `;

    return this.sendMail({
      to: params.to,
      subject,
      html: this.wrapTemplate('Project Proposal Notification', htmlContent),
      text,
      type: 'project_proposal',
    });
  }

  /**
   * 4. Send Milestone Submitted Notification
   */
  async sendMilestoneSubmittedNotification(params: {
    to: string;
    recipientName: string;
    projectTitle: string;
    milestoneTitle: string;
    providerName: string;
    projectId: string;
  }) {
    const subject = `Deliverable Submitted for Review: "${params.milestoneTitle}"`;
    const projectUrl = `${env.APP_BASE_URL}/projects/${params.projectId}`;

    const text = `Hello ${params.recipientName},\n\nThe assigned provider (${params.providerName}) has submitted work proof deliverables for milestone "${params.milestoneTitle}" in project "${params.projectTitle}".\n\nPlease inspect the evidence artifacts and approve or request revision.\n\nReview evidence: ${projectUrl}`;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #38BDF8; font-weight: 700;">
        Deliverable Submitted for Review
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello <strong style="color: #FFFFFF;">${params.recipientName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        Provider <strong style="color: #FFFFFF;">${params.providerName}</strong> has submitted verifiable work proof artifacts for deliverable milestone:
      </p>
      <div style="background-color: #0F172A; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <h3 style="margin: 0 0 4px 0; font-size: 15px; color: #FFFFFF;">${params.milestoneTitle}</h3>
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">Project: ${params.projectTitle}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${projectUrl}" style="background-color: #0284C7; color: #FFFFFF; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Inspect Proof &amp; Approve
        </a>
      </div>
    `;

    return this.sendMail({
      to: params.to,
      subject,
      html: this.wrapTemplate('Deliverable Review Notification', htmlContent),
      text,
      type: 'milestone_submitted',
    });
  }

  /**
   * 5. Send Payment Release / Escrow Disbursement Notification
   */
  async sendPaymentReceiptNotification(params: {
    to: string;
    recipientName: string;
    projectTitle: string;
    milestoneTitle: string;
    amountDollars: string;
    captureId: string;
    role: 'client' | 'provider';
    projectId: string;
  }) {
    const isClient = params.role === 'client';
    const subject = isClient
      ? `Payment Receipt: $${params.amountDollars} USD Released for "${params.milestoneTitle}"`
      : `Payment Received: $${params.amountDollars} USD Released for "${params.milestoneTitle}"`;

    const text = `Hello ${params.recipientName},\n\nPayment of $${params.amountDollars} USD for milestone "${params.milestoneTitle}" in project "${params.projectTitle}" has been settled via PayPal Sandbox.\n\nCapture Reference: ${params.captureId}\n\nClausora Escrow Engine`;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #10B981; font-weight: 700;">
        ${isClient ? '✓ Escrow Payment Released' : '✓ Escrow Funds Disbursed'}
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello <strong style="color: #FFFFFF;">${params.recipientName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        ${isClient
          ? `Your payment for deliverable <strong style="color: #FFFFFF;">${params.milestoneTitle}</strong> has been successfully captured and released.`
          : `Escrow funds for your verified deliverable <strong style="color: #FFFFFF;">${params.milestoneTitle}</strong> have been released to your account.`}
      </p>
      <div style="background-color: #0F172A; border: 1px solid #10B981; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; color: #A5B4FC; font-family: monospace;">
          Settlement Amount
        </span>
        <span style="font-size: 30px; font-weight: 800; color: #10B981; font-family: monospace;">
          $${params.amountDollars} USD
        </span>
        <span style="display: block; font-size: 11px; color: #64748B; font-family: monospace; margin-top: 6px;">
          PayPal Capture ID: ${params.captureId}
        </span>
      </div>
    `;

    return this.sendMail({
      to: params.to,
      subject,
      html: this.wrapTemplate('Payment Settlement Receipt', htmlContent),
      text,
      type: 'payment_settled',
    });
  }

  /**
   * Send a test verification email to confirm SMTP connectivity in DEV or PROD
   */
  async sendTestEmail(toEmail: string): Promise<{
    success: boolean;
    mode: 'live_smtp' | 'simulated';
    message: string;
    logId: string;
    details?: any;
  }> {
    const fromAddress = process.env.EMAIL_FROM || env.EMAIL_FROM || 'Clausora <notifications@clausora.dev>';
    const isLive = this.isConfigured && this.transporter !== null;

    const htmlContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #FFFFFF; font-weight: 700;">
        Email Dispatch System Test
      </h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #CBD5E1;">
        Hello,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #E2E8F0; line-height: 1.6;">
        This is an official verification email from your <strong>Clausora Work Execution Platform</strong>.
        If this message has arrived in your inbox, your email sending integration is operating correctly in
        <strong>${(process.env.NODE_ENV || env.NODE_ENV).toUpperCase()}</strong> mode!
      </p>
      <div style="background-color: #1E293B; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #A7F3D0; font-family: monospace; line-height: 1.6;">
          <strong>Mode:</strong> ${isLive ? 'Live SMTP Transport' : 'Simulated / Logged'}<br>
          <strong>Environment:</strong> ${process.env.NODE_ENV || env.NODE_ENV}<br>
          <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
          <strong>Sender:</strong> ${fromAddress}
        </p>
      </div>
      <p style="margin: 0; font-size: 12px; color: #94A3B8;">
        Deterministic escrow releases, Work DNA blueprints, and 6-digit password recovery codes will be reliably delivered through this channel.
      </p>
    `;

    const res = await this.sendMail({
      to: toEmail,
      subject: `Clausora: Email Delivery Test [${(process.env.NODE_ENV || env.NODE_ENV).toUpperCase()}]`,
      text: `Clausora Email Delivery Test\n\nYour Clausora email sending integration is active and operating in ${(process.env.NODE_ENV || env.NODE_ENV).toUpperCase()} mode.\n\nTimestamp: ${new Date().toISOString()}\nSender: ${fromAddress}`,
      html: this.wrapTemplate('Email System Test', htmlContent),
      type: 'system_test',
    });

    return {
      success: res.success,
      mode: isLive ? 'live_smtp' : 'simulated',
      message: isLive
        ? (res.success ? `Live test email successfully dispatched to ${toEmail}!` : `SMTP delivery failed: ${this.lastError || 'Unknown error'}`)
        : `Email recorded in simulated mode (no SMTP configured). Set SMTP_USER and SMTP_PASS in .env to send real emails.`,
      logId: res.logId,
      details: {
        configured: isLive,
        smtpHost: process.env.SMTP_HOST || env.SMTP_HOST || 'gmail',
        sender: fromAddress,
        lastError: this.lastError,
      },
    };
  }

  /**
   * Check SMTP configuration status
   */
  getStatus() {
    const smtpUser = process.env.SMTP_USER || env.SMTP_USER;
    const maskedUser = smtpUser
      ? `${smtpUser.substring(0, 3)}***@${smtpUser.split('@')[1] || ''}`
      : undefined;

    return {
      isConfigured: this.isConfigured,
      mode: this.isConfigured ? ('live_smtp' as const) : ('simulated' as const),
      service: process.env.SMTP_SERVICE || env.SMTP_SERVICE || (env.SMTP_HOST?.includes('gmail') ? 'gmail' : undefined),
      host: process.env.SMTP_HOST || env.SMTP_HOST || (this.isConfigured ? 'smtp.gmail.com' : undefined),
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true' || env.SMTP_SECURE,
      user: maskedUser,
      from: process.env.EMAIL_FROM || env.EMAIL_FROM,
      lastError: this.lastError,
    };
  }
}

export const emailService = new EmailService();

