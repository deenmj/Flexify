// No external npm SDK needed — we use native fetch for zero-dependency speed

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    console.error("[EMAIL FATAL] Missing BREVO_API_KEY. Emails will not send.");
    return null;
  }

  try {
    console.log(`[EMAIL] Attempting to send (via Brevo REST API) ${subject} to ${to}...`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "Flexify",
          email: process.env.BREVO_SENDER_EMAIL || "noreply@flexify.lk" // Must be verified in Brevo
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[EMAIL ERROR DETAILS] Brevo API Rejected the email:`, data || response.statusText);
      return null;
    }

    console.log(`[EMAIL SUCCESS] ✅ Sent to ${to} | MessageId: ${data?.messageId}`);
    return data;

  } catch (error) {
    console.error(`[EMAIL FATAL] ❌ Failed to send to ${to}`);
    console.error(`[EMAIL ERROR DETAILS]`, error.message);
  }
};

export default sendEmail;


