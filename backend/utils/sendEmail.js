import nodemailer from "nodemailer";

// Create a SINGLETON transporter (reused across all email sends)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[EMAIL] Missing EMAIL_USER or EMAIL_PASS — emails will not be sent.");
    return null;
  }

  const settings = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    // Timeouts to prevent hanging on cloud hosting
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  // Only use host/port if service is not gmail
  if (!process.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE !== 'gmail') {
    settings.host = process.env.EMAIL_HOST || "smtp.gmail.com";
    settings.port = parseInt(process.env.EMAIL_PORT) || 587;
    settings.secure = settings.port === 465;
  }

  transporter = nodemailer.createTransport(settings);
  console.log(`[EMAIL] Transporter created for ${process.env.EMAIL_USER}`);
  return transporter;
}

const sendEmail = async ({ to, subject, html }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`[EMAIL] Skipped (no transporter): ${subject} → ${to}`);
    return;
  }

  try {
    const info = await mailer.sendMail({
      from: `"Flexify" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] ✅ Sent to ${to} | MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to ${to}:`, error.message);

    // Reset transporter on auth/connection errors so it reconnects next time
    if (error.code === 'EAUTH' || error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      console.log("[EMAIL] Resetting transporter due to connection error...");
      transporter = null;
    }

    // Single retry with a fresh transporter
    try {
      const freshMailer = getTransporter();
      if (freshMailer) {
        await freshMailer.sendMail({
          from: `"Flexify" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`[EMAIL] ✅ Retry succeeded to ${to}`);
      }
    } catch (retryErr) {
      console.error(`[EMAIL] ❌ Retry also failed to ${to}:`, retryErr.message);
      // Don't throw — email failure should never crash the app
    }
  }
};

export default sendEmail;
