"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpToEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASSWORD
    }
});
// Generate OTP and send email
const sendOtpToEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ email = '', otp = '', subject = 'Your OTP Code', text = '', html }) {
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
        yield transporter.sendMail(mailOptions);
        console.log('OTP sent successfully to', email);
    }
    catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP.');
    }
});
exports.sendOtpToEmail = sendOtpToEmail;
// Check Otp Resretric
//# sourceMappingURL=emailSender.js.map