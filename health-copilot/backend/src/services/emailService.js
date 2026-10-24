const https = require('https');
const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Dispatches email via Resend's native HTTPS REST API
   */
  async sendViaResendHttp({ to, subject, html, text }) {
    const apiKey = config.email.providerApiKey;
    if (!apiKey) return null;

    // Use onboarding@resend.dev unless user has verified their custom domain
    let fromAddress = config.email.from;
    if (!fromAddress || fromAddress.includes('healthcopilot.app')) {
      fromAddress = 'HealthCopilot <onboarding@resend.dev>';
    }

    const payload = JSON.stringify({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, provider: 'resend_https', body });
            } else {
              console.warn('[EmailService] Resend API response error:', res.statusCode, body);
              resolve({ success: false, error: body });
            }
          });
        }
      );

      req.on('error', (err) => {
        console.error('[EmailService] Resend HTTPS request error:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(payload);
      req.end();
    });
  }

  getTransporter() {
    if (this.transporter) return this.transporter;
    const { email } = config;

    // SMTP Transporter if custom host is provided
    if (email.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: email.smtpHost,
        port: email.smtpPort,
        secure: email.smtpPort === 465,
        auth: {
          user: email.smtpUser,
          pass: email.smtpPass,
        },
      });
      return this.transporter;
    }
    return null;
  }

  /**
   * Main email dispatch handler
   */
  async sendMail({ to, subject, html, text }) {
    // 1. If Resend API Key is configured, use fast native HTTPS API
    if (config.email.providerApiKey && config.email.providerApiKey.startsWith('re_')) {
      const httpResult = await this.sendViaResendHttp({ to, subject, html, text });
      if (httpResult?.success) {
        return httpResult;
      }
    }

    // 2. Custom SMTP fallback if configured
    const transporter = this.getTransporter();
    if (transporter && config.nodeEnv !== 'test') {
      try {
        const info = await transporter.sendMail({
          from: config.email.from || 'HealthCopilot <onboarding@resend.dev>',
          to,
          subject,
          text,
          html,
        });
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (err) {
        console.error('[EmailService] SMTP delivery failed:', err.message);
      }
    }

    // 3. Fallback console logging in dev/test
    if (config.nodeEnv !== 'test') {
      console.log(`\n================== [HEALTHCOPILOT EMAIL DISPATCH] ==================`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text || html}`);
      console.log(`====================================================================\n`);
    }

    return { success: true, provider: 'console_dev_fallback' };
  }

  /**
   * Sends an email verification link and 6-digit OTP to the user.
   */
  async sendVerificationEmail({ to, name, token, code }) {
    const verifyUrl = `${config.clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
    const subject = 'Verify your HealthCopilot account';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0284c7; font-size: 24px; font-weight: 800; margin: 0;">Health<span style="color: #0f172a;">Copilot</span></h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Personal AI Health Assistant & Secure Vault</p>
        </div>
        <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${name || 'there'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Thank you for registering. To ensure your health records remain private and accessible only to you, please verify your email address.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
            Verify Email Address
          </a>
        </div>

        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px;">Your 6-Digit One-Time Password (OTP):</div>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0284c7; font-family: monospace;">${code}</div>
          <div style="font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 8px;">⏱ Valid for 5 minutes only (Single-use)</div>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #0284c7; word-break: break-all;">${verifyUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          If you didn't create an account with HealthCopilot, please ignore this email. Never share your OTP with anyone.
        </p>
      </div>
    `;

    const text = `
Hi ${name || 'there'},

Please verify your HealthCopilot account.

Your 6-digit OTP code: ${code}
(Valid for 5 minutes only. Single-use).

Or click the link below to verify your email address:
${verifyUrl}

If you did not request this email, please ignore it.
    `.trim();

    return this.sendMail({ to, subject, html, text });
  }

  /**
   * Sends a password reset link to the user.
   */
  async sendPasswordResetEmail({ to, name, token }) {
    const resetUrl = `${config.clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
    const subject = 'Reset your HealthCopilot password';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0284c7; font-size: 24px; font-weight: 800; margin: 0;">Health<span style="color: #0f172a;">Copilot</span></h1>
        </div>
        <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${name || 'there'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          We received a request to reset your password. Click the button below to choose a new password:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.
        </p>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Link: <a href="${resetUrl}" style="color: #0284c7; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
    `;

    const text = `
Hi ${name || 'there'},

You requested a password reset for HealthCopilot.

Reset your password here:
${resetUrl}

This link is valid for 1 hour. If you did not request this, please ignore this email.
    `.trim();

    return this.sendMail({ to, subject, html, text });
  }

  async sendGenericEmail({ to, subject, text, html }) {
    const defaultHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0284c7; margin-top: 0;">${subject}</h2>
        <div style="line-height: 1.6; white-space: pre-line;">${text}</div>
      </div>
    `.trim();

    return this.sendMail({
      to,
      subject,
      text,
      html: html || defaultHtml,
    });
  }
}

module.exports = new EmailService();
