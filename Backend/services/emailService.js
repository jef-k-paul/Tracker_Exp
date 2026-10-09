const nodemailer = require("nodemailer");
const dns = require("dns").promises;

/**
 * Resolves smtp.gmail.com explicitly to an IPv4 address.
 * Nodemailer v10's internal resolver randomly selects between IPv4 and IPv6 addresses,
 * which causes ENETUNREACH errors on cloud hosts like Render that lack IPv6 network routes.
 * Passing the resolved IPv4 address directly prevents Nodemailer from ever attempting an IPv6 address.
 */
const resolveGmailIpv4 = async () => {
  try {
    const addresses = await dns.resolve4("smtp.gmail.com");
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
  } catch (err) {
    console.warn("[EMAIL WARNING] Could not resolve smtp.gmail.com IPv4 ahead of time:", err.message);
  }
  return "smtp.gmail.com";
};

/**
 * Creates and returns a Nodemailer transporter using direct IPv4 with SNI.
 * Strips whitespace and quotes from EMAIL_PASS.
 *
 * @param {number} port - 465 (SSL direct) or 587 (STARTTLS)
 */
const getTransporter = async (port = 465) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim().replace(/^["']|["']$/g, "") : "";
  const rawPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim().replace(/^["']|["']$/g, "") : "";
  
  if (!user || !rawPass) {
    return null;
  }

  // Google displays App Passwords with spaces, e.g. "abcd efgh ijkl mnop". Strip all whitespace and quotes.
  const cleanPass = rawPass.replace(/[\s"']/g, "");
  const targetHost = await resolveGmailIpv4();

  return nodemailer.createTransport({
    host: targetHost,
    port: port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user: user,
      pass: cleanPass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      servername: "smtp.gmail.com", // Essential for TLS handshake when connecting directly to an IP
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    }
  });
};

exports.sendPasswordResetOtp = async (toEmail, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[EMAIL NOTICE] EMAIL_USER or EMAIL_PASS environment variable is missing on this server instance.");
  } else {
    console.log(`[EMAIL] Attempting to send OTP via Gmail SMTP (IPv4 direct) to ${toEmail}...`);
  }

  const primaryTransporter = await getTransporter(465);

  // If Gmail SMTP credentials are configured, try sending real email
  if (primaryTransporter) {
    const fromEmail = process.env.EMAIL_USER.trim().replace(/^["']|["']$/g, "");
    const mailOptions = {
      from: `"Family Expense Tracker" <${fromEmail}>`,
      to: toEmail.trim(),
      subject: "Your Password Reset OTP - Family Expense Tracker",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0284c7; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #334155; font-size: 15px;">
            You requested to reset your account password or access PIN for Family Expense Tracker.
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

    // Attempt 1: Port 465 (SSL) with direct IPv4
    try {
      await primaryTransporter.sendMail(mailOptions);
      console.log(`[EMAIL] Password reset OTP sent successfully via Port 465 to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (err465) {
      console.warn(`[EMAIL WARNING] Port 465 failed (${err465.message}). Retrying on Port 587 (STARTTLS with direct IPv4)...`);

      // Attempt 2: Fallback to Port 587 (STARTTLS) with direct IPv4
      try {
        const fallbackTransporter = await getTransporter(587);
        if (fallbackTransporter) {
          await fallbackTransporter.sendMail(mailOptions);
          console.log(`[EMAIL] Password reset OTP sent successfully via Port 587 to ${toEmail}`);
          return { success: true, simulated: false };
        }
      } catch (err587) {
        console.error("[EMAIL ERROR] Both Port 465 and Port 587 failed to send email:", err587.message);
        if (err587.message && err587.message.includes("535")) {
          console.error(
            "[EMAIL ERROR TIP] Gmail authentication failed (535). Ensure 2-Step Verification is turned ON on your Google account and you generated a 16-character 'App Password' from https://myaccount.google.com/apppasswords."
          );
        }
      }
    }
  }

  // Fallback simulation for dev/testing when SMTP is not configured or all attempts fail
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
