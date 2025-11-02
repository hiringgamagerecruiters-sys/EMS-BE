const mongoose = require('mongoose');

const dailyDiarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  filePath: { type: String }, 
  filePathLink: { type: String }, 
  date: { type: Date, default: Date.now },
  diaryStatus: { type: String, enum: ['Replied', 'Pending'], default: 'Pending' },
   time: { 
    type: String, 
    default: () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" ,  hour12: true  }) 
  },
  
  // Reply fields
  replyMessage: { type: String },
  replyDate: { type: Date },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Optional: If you want to support file attachments in replies
  replyFilePath: { type: String },
  replyFileName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DailyDiary', dailyDiarySchema);