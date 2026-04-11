import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  const transporterSettings = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true, // Reuse connections for better performance
    maxConnections: 5,
    maxMessages: 100
  };

  // Only use host/port if service is not gmail or not provided
  if (!process.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE !== 'gmail') {
    transporterSettings.host = process.env.EMAIL_HOST || "smtp.gmail.com";
    transporterSettings.port = parseInt(process.env.EMAIL_PORT) || 587;
    transporterSettings.secure = transporterSettings.port === 465;
  }

  const transporter = nodemailer.createTransport(transporterSettings);

  try {
    // Verify connection configuration
    await transporter.verify();
    
    await transporter.sendMail({
      from: `"Flexify" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    
    console.log(`Email successfully sent to ${to}`);
  } catch (error) {
    console.error("Email Transporter Error:", error);
    throw error;
  }
};

export default sendEmail;

