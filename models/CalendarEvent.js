const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  isLeaveDay: { type: Boolean, default: false },
  description: { type: String }
});

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);