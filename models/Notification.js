const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // recipient (for personal notifications)
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who sent the notification
  title: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  target: { type: String, enum: ['user', 'all'], default: 'user' },
});

module.exports = mongoose.model('Notification', notificationSchema);