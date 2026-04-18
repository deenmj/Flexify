import * as brevo from "@getbrevo/brevo";

let apiInstance = null;

function getBrevoClient() {
  if (apiInstance) return apiInstance;

  if (!process.env.BREVO_API_KEY) {
    console.error("[EMAIL FATAL] Missing BREVO_API_KEY in environment variables. Emails will not send.");
    return null;
  }

  // Configure Brevo API
  let defaultClient = brevo.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  apiInstance = new brevo.TransactionalEmailsApi();
  console.log(`[EMAIL SETUP] Brevo Client Initialized.`);
  return apiInstance;
}

const sendEmail = async ({ to, subject, html }) => {
  const mailer = getBrevoClient();
  if (!mailer) {
    console.warn(`[EMAIL SKIPPED] No Brevo client configured: ${subject} → ${to}`);
    return;
  }

  try {
    console.log(`[EMAIL] Attempting to send (via Brevo) ${subject} to ${to}...`);

    let sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "Flexify",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@flexify.lk" // Fallback safety
    };
    sendSmtpEmail.to = [{ email: to }];

    // Execute the send
    const data = await mailer.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL SUCCESS] ✅ Sent to ${to} | MessageId: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error(`[EMAIL FATAL] ❌ Failed to send (via Brevo) to ${to}`);
    
    // Brevo API errors are usually nested in error.response
    if (error.response && error.response.text) {
      console.error(`[EMAIL ERROR DETAILS] Brevo API Response:`, error.response.text);
    } else {
      console.error(`[EMAIL ERROR DETAILS]`, error.message);
      console.error(error); // Full raw error
    }
  }
};

export default sendEmail;

