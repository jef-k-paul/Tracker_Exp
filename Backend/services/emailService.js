const nodemailer = require("nodemailer");

/**
 * Creates and returns a Nodemailer transporter using Gmail SMTP.
 * Strips whitespace from EMAIL_PASS (Google displays 16-character App Passwords with spaces: "xxxx xxxx xxxx xxxx").
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const rawPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : "";
  
  if (!user || !rawPass) {
    return null;
  }

  // Google displays App Passwords with spaces, e.g. "abcd efgh ijkl mnop". Strip all whitespace.
  const cleanPass = rawPass.replace(/\s+/g, "");

  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Port 465 SSL
    auth: {
      user: user,
      pass: cleanPass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

exports.sendPasswordResetOtp = async (toEmail, otp) => {
  const transporter = getTransporter();

  // If Gmail SMTP credentials are configured, send real email
  if (transporter) {
    try {
      const fromEmail = process.env.EMAIL_USER.trim();
      const mailOptions = {
        from: `"Expense Tracker" <${fromEmail}>`,
        to: toEmail.trim(),
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
      console.log(`[EMAIL] Password reset OTP sent successfully to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error("[EMAIL ERROR] Failed to send via Gmail SMTP:", err.message);
      if (err.message && err.message.includes("535")) {
        console.error(
          "[EMAIL ERROR TIP] Gmail authentication failed (535). Ensure 2-Step Verification is turned ON on your Google account and you generated a 16-character 'App Password' from https://myaccount.google.com/apppasswords."
        );
      }
      // If SMTP fails, fall through to simulation so the user is not stuck
    }
  }

  // Fallback simulation for dev/testing when SMTP is not configured or fails
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
