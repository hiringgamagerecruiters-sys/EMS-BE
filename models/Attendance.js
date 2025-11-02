const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date},
  time:{ type: String },
  status: { type: String, enum: ['Attended', 'Late', 'Absent', 'OnLeave'], default: 'Attended' },
  key: {type: Number, enum: [1,0], default: 1 }
});
module.exports = mongoose.model('Attendance', attendanceSchema);