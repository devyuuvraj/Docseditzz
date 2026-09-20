import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return transporter;
};

const baseTemplate = (title, body) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0f0f17;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:520px;margin:32px auto;background:#181825;border-radius:16px;overflow:hidden;border:1px solid #2a2a3d;">
      <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:28px 32px;">
        <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px;">DOCSEDITZ</h1>
      </div>
      <div style="padding:32px;color:#d4d4e4;">
        <h2 style="margin-top:0;color:#fff;font-size:18px;">${title}</h2>
        ${body}
        <p style="color:#8a8aa3;font-size:12px;margin-top:32px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </body>
</html>`;

export const sendEmail = async ({ to, subject, html }) => {
  if (!config.smtp.host) {
    console.warn(`[email] SMTP not configured. Would send "${subject}" to ${to}`);
    return;
  }
  const send = getTransporter().sendMail({ from: config.smtp.from, to, subject, html });
  const timeoutMs = 12000;
  await Promise.race([
    send,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMTP send timed out')), timeoutMs);
    }),
  ]);
};

export const sendOtpEmail = (to, name, otp) =>
  sendEmail({
    to,
    subject: `${otp} is your DOCSEDITZ verification code`,
    html: baseTemplate(
      `Hi ${name}, verify your email`,
      `<p>Use the code below to verify your account. It expires in <b>10 minutes</b>.</p>
       <div style="text-align:center;margin:24px 0;">
         <span style="display:inline-block;background:#26263a;color:#fff;font-size:32px;letter-spacing:12px;padding:16px 28px;border-radius:12px;font-weight:700;">${otp}</span>
       </div>`
    ),
  });

export const sendPasswordResetEmail = (to, name, resetUrl) =>
  sendEmail({
    to,
    subject: 'Reset your DOCSEDITZ password',
    html: baseTemplate(
      `Hi ${name}, reset your password`,
      `<p>Click the button below to set a new password. This link expires in <b>30 minutes</b>.</p>
       <div style="text-align:center;margin:24px 0;">
         <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;">Reset Password</a>
       </div>
       <p style="color:#8a8aa3;font-size:12px;word-break:break-all;">Or paste this link: ${resetUrl}</p>`
    ),
  });

export const sendWelcomeEmail = (to, name) =>
  sendEmail({
    to,
    subject: 'Welcome to DOCSEDITZ 🎉',
    html: baseTemplate(
      `Welcome aboard, ${name}!`,
      `<p>Your account is verified. You can now convert, edit, summarize and share documents with AI superpowers.</p>
       <div style="text-align:center;margin:24px 0;">
         <a href="${config.clientUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;">Open Dashboard</a>
       </div>`
    ),
  });
