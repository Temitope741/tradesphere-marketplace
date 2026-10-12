const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // In production, configure with actual SMTP settings
  // For now, this is a placeholder
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Email options
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    // Send email
    const info = await transporter.sendMail(message);
    console.log('✅ Email sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('❌ Email error:', error);
    // Don't throw error - email failure shouldn't break the app
  }
};

module.exports = sendEmail;