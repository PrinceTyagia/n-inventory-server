import nodemailer from 'nodemailer';
interface SendEmailOptions {
  email?: string;
  otp?: string;
  subject?: string;
  text?: string;
  html?: string; // <-- added html support
}
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass:  process.env.EMAIL_AUTH_PASSWORD
    }
});
// Generate OTP and send email
export const sendOtpToEmail = async ({
  email = '', otp = '', subject = '', text = '', html
}: SendEmailOptions) => {
  if (!email) {
    throw new Error("Email is required to send OTP.");
  }

  const mailOptions = {
    from: 'vikranttyagia@gmail.com',
    to: email,
    subject,
    text: text || `Your OTP is: ${otp}`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP sent successfully to', email);
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP.');
  }
};

// Check Otp Resretric