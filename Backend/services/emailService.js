const nodemailer = require("nodemailer");
const dns = require("dns").promises;

/**
 * Returns clean HTML template for Password Reset OTP.
 */
const getOtpHtml = (otp) => {
  return `
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
  `;
};

/**
 * 1. METHOD 1: Brevo REST API (Over HTTPS Port 443)
 * Ideal for cloud free tiers (like Render Free) where outbound SMTP ports 465/587 are blocked.
 * Free tier: 300 emails/day, no credit card required.
 */
const sendViaBrevo = async (toEmail, otp) => {
  const apiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : "";
  if (!apiKey) return null;

  const senderEmail = process.env.EMAIL_USER 
    ? process.env.EMAIL_USER.trim().replace(/^["']|["']$/g, "") 
    : (process.env.BREVO_SENDER || "noreply@familyexpensetracker.com");

  console.log(`[EMAIL] Sending OTP via Brevo HTTPS API (Port 443) to ${toEmail}...`);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "Family Expense Tracker", email: senderEmail },
      to: [{ email: toEmail.trim() }],
      subject: "Your Password Reset OTP - Family Expense Tracker",
      htmlContent: getOtpHtml(otp)
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API Error (${response.status}): ${errorBody}`);
  }

  console.log(`[EMAIL] Password reset OTP sent successfully via Brevo API to ${toEmail}`);
  return true;
};

/**
 * 2. METHOD 2: Resend REST API (Over HTTPS Port 443)
 * Free tier: 100 emails/day, 3,000/month.
 */
const sendViaResend = async (toEmail, otp) => {
  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : "";
  if (!apiKey) return null;

  const fromAddress = process.env.RESEND_FROM || "Family Expense Tracker <onboarding@resend.dev>";

  console.log(`[EMAIL] Sending OTP via Resend HTTPS API (Port 443) to ${toEmail}...`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail.trim()],
      subject: "Your Password Reset OTP - Family Expense Tracker",
      html: getOtpHtml(otp)
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API Error (${response.status}): ${errorBody}`);
  }

  console.log(`[EMAIL] Password reset OTP sent successfully via Resend API to ${toEmail}`);
  return true;
};

/**
 * 3. METHOD 3: Direct Gmail SMTP
 * Resolves smtp.gmail.com explicitly to an IPv4 address.
 * Works on local machines or cloud environments with unblocked SMTP ports.
 */
const resolveGmailIpv4 = async () => {
  try {
    const addresses = await dns.resolve4("smtp.gmail.com");
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
  } catch (err) {
    // ignore
  }
  return "smtp.gmail.com";
};

const getSmtpTransporter = async (port = 465) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim().replace(/^["']|["']$/g, "") : "";
  const rawPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim().replace(/^["']|["']$/g, "") : "";
  
  if (!user || !rawPass) {
    return null;
  }

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
    connectionTimeout: 5000, // 5s timeout to fail fast if ports 465/587 are blocked by cloud firewall
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      servername: "smtp.gmail.com",
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    }
  });
};

const sendViaSmtp = async (toEmail, otp) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim().replace(/^["']|["']$/g, "") : "";
  if (!user || !process.env.EMAIL_PASS) return null;

  const mailOptions = {
    from: `"Family Expense Tracker" <${user}>`,
    to: toEmail.trim(),
    subject: "Your Password Reset OTP - Family Expense Tracker",
    html: getOtpHtml(otp)
  };

  // Attempt Port 465
  try {
    const transporter465 = await getSmtpTransporter(465);
    if (transporter465) {
      await transporter465.sendMail(mailOptions);
      console.log(`[EMAIL] Password reset OTP sent successfully via SMTP Port 465 to ${toEmail}`);
      return true;
    }
  } catch (err465) {
    console.warn(`[EMAIL WARNING] SMTP Port 465 failed (${err465.message}). Retrying Port 587...`);
  }

  // Attempt Port 587
  try {
    const transporter587 = await getSmtpTransporter(587);
    if (transporter587) {
      await transporter587.sendMail(mailOptions);
      console.log(`[EMAIL] Password reset OTP sent successfully via SMTP Port 587 to ${toEmail}`);
      return true;
    }
  } catch (err587) {
    console.error(`[EMAIL ERROR] SMTP Port 587 also failed (${err587.message}).`);
    if (err587.message && (err587.message.includes("timeout") || err587.message.includes("ETIMEDOUT"))) {
      console.warn(
        "\n[RENDER NOTICE] Outbound SMTP ports 465 & 587 are blocked by Render's Free Tier egress firewall.\n" +
        "To send live emails on Render for free, use an HTTPS API (Port 443):\n" +
        "1. Create a free Brevo account (https://brevo.com - 300 free emails/day, no credit card required).\n" +
        "2. Add BREVO_API_KEY in your Render Environment Variables.\n"
      );
    }
  }

  return false;
};

/**
 * Main dispatcher: Tries HTTPS APIs first (Port 443 - never blocked), then SMTP, then fallback simulation.
 */
exports.sendPasswordResetOtp = async (toEmail, otp) => {
  // 1. Try Brevo HTTPS API (Recommended for Render free tier)
  try {
    const sent = await sendViaBrevo(toEmail, otp);
    if (sent) return { success: true, simulated: false };
  } catch (err) {
    console.error("[EMAIL ERROR] Brevo API failed:", err.message);
  }

  // 2. Try Resend HTTPS API
  try {
    const sent = await sendViaResend(toEmail, otp);
    if (sent) return { success: true, simulated: false };
  } catch (err) {
    console.error("[EMAIL ERROR] Resend API failed:", err.message);
  }

  // 3. Try direct Gmail SMTP (Works on local dev & non-blocked hosts)
  try {
    const sent = await sendViaSmtp(toEmail, otp);
    if (sent) return { success: true, simulated: false };
  } catch (err) {
    console.error("[EMAIL ERROR] SMTP sending failed:", err.message);
  }

  // 4. Fallback simulation (Dev/Testing mode)
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
