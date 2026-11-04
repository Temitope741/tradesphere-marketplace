const nodemailer = require('nodemailer');

// Sends an email using the SMTP settings in your .env:
//   SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, FROM_NAME, FROM_EMAIL
//
// Returns the send result on success, or null if email isn't configured or
// failed. It never throws, so an email problem can't crash a request.
const sendEmail = async (options) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return null; // email not configured
  }

  try {
    const port = Number(process.env.SMTP_PORT) || 587;

    // NOTE: the correct nodemailer function is createTransport
    // (the old code had "createTransporter", which doesn't exist).
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'TradeSphere'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    });

    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return null;
  }
};

module.exports = sendEmail;