const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables from your .env file

const sendActivationEmail = async (email) => {
  try {
    // Set up Nodemailer transporter using credentials from .env
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.MY_GMAIL, // Fetch Gmail address from environment
        pass: process.env.MY_PASSWORD, // Fetch password from environment
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Admin" <${process.env.MY_GMAIL}>`, // Set the sender as the admin email
      to: email,
      subject: 'Account Deactivated',
      text: `Your account has been deactivated. If you want to reactivate it, please contact the admin at manahilfatima72809@gmail.com.`,
    });

    console.log('Activation email sent successfully', info);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendActivationEmail };
