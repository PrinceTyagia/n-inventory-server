import otpGenerator from "otp-generator";



export const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
export const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false, // 💡 This is important!
      specialChars: false,
    });