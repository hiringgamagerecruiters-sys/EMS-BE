const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/email");

router.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  const result = await sendEmail({ name, email, message });
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

module.exports = router;
