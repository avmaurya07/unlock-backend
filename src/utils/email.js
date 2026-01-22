const brevo = require("../config/brevo");

exports.sendEmailOTP = async (email, otp) => {
  try {
    await brevo.sendTransacEmail({
      sender: { email: "unlockstartup.business@gmail.com", name: "Unlock Startup" },
      to: [{ email }],
      subject: "Your OTP Verification Code",
      htmlContent: `<p>Your OTP for login is: <strong>${otp}</strong></p>`,
    });

    return true;
  } catch (error) {
    console.log("Brevo Error:", error);
    return false;
  }
};
