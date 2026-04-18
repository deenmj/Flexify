import nodemailer from "nodemailer";

// Create a SINGLETON transporter (reused across all email sends)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("[EMAIL ERROR] Missing EMAIL_USER or EMAIL_PASS environment variables. Emails will not be sent.");
    return null;
  }

  console.log(`[EMAIL SETUP] Initialize Nodemailer. Env: ${process.env.NODE_ENV || 'development'}`);
  
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
    console.warn(`[EMAIL SKIPPED] No transporter configured: ${subject} → ${to}`);
    return;
  }

  try {
    console.log(`[EMAIL] Attempting to send ${subject} to ${to}...`);
    const info = await mailer.sendMail({
      from: `"Flexify" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL SUCCESS] ✅ Sent to ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL FATAL] ❌ Failed to ${to}`);
    console.error(`[EMAIL ERROR DETAILS] Name: ${error.name}, Message: ${error.message}, Code: ${error.code}`);
    console.error(error); // Log full raw error object for debugging Railway issues

    // Reset transporter on auth/connection errors so it reconnects next time
    if (error.code === 'EAUTH' || error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      console.log("[EMAIL] Resetting transporter due to connection/auth error...");
      transporter = null;
    }

    // Single retry with a fresh transporter
    try {
      console.log(`[EMAIL RETRY] Attempting retry to ${to}...`);
      const freshMailer = getTransporter();
      if (freshMailer) {
        const retryInfo = await freshMailer.sendMail({
          from: `"Flexify" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`[EMAIL SUCCESS] ✅ Retry succeeded to ${to} | MessageId: ${retryInfo.messageId}`);
        return retryInfo;
      }
    } catch (retryErr) {
      console.error(`[EMAIL RETRY FATAL] ❌ Retry also failed to ${to}`);
      console.error(`[EMAIL RETRY ERROR DETAILS] Code: ${retryErr.code}, Message: ${retryErr.message}`);
      console.error(retryErr); // Full raw error
      // Don't throw — email failure should never crash the app
    }
  }
};

export default sendEmail;
