const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Step 1: Request OTP (input: email)
router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP (remove old ones first)
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    // --- Send OTP via Email ---
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>🔐 Password Reset Request</h2>
          <p>Your OTP code is:</p>
          <h1 style="background:#f4f4f4; padding:10px; border-radius:5px; display:inline-block;">${otpCode}</h1>
          <p>This code expires in <b>5 minutes</b>.</p>
          <p>If you didn’t request this, please ignore this email.</p>
          <br>
          <p>— Your App Support Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "OTP sent successfully to your email!" });
  } catch (err) {
    console.error("OTP request error:", err.message);
    res.status(500).json({ message: "Failed to send OTP email." });
  }
});

// Step 2: Verify OTP (input: email + otp)
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const record = await Otp.findOne({ email, otp });
    if (!record) return res.status(400).json({ message: "Invalid OTP." });

    res.json({ message: "OTP verified successfully!" });
  } catch (err) {
    console.error("OTP verify error:", err.message);
    res.status(500).json({ message: "Failed to verify OTP." });
  }
});

// Step 3: Reset Password (input: email + newPassword)
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    await Otp.deleteMany({ email });

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Password reset error:", err.message);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

module.exports = router;
