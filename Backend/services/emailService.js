const nodemailer = require("nodemailer");

let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

exports.sendPasswordResetOtp = async (toEmail, otp) => {
  // If Gmail SMTP credentials are configured, try sending real email
  if (transporter) {
    try {
      const mailOptions = {
        from: `"Expense Tracker" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your Password Reset OTP - Expense Tracker",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0284c7; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #334155; font-size: 15px;">
              You requested to reset your account password or access PIN for Expense Tracker.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; background: #f8fafc; border: 2px dashed #0284c7; padding: 12px 28px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this reset, you can safely ignore this email.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Password reset OTP sent to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error("[EMAIL ERROR] Failed to send via Gmail SMTP:", err.message);
      // Fallback to console simulation so dev/testing doesn't break
    }
  }

  // Fallback simulation for dev/testing when SMTP is not configured
  console.log(`
======================================================
[DEV / TESTING MODE] PASSWORD RESET OTP
Recipient : ${toEmail}
OTP Code  : ${otp}
Expires In: 10 minutes
======================================================
  `);

  return { success: true, simulated: true, otp };
};
