const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseTitle: {
    type: String,
    required: true,
    trim: true
  },
  courseDescription: {
    type: String,
    required: true,
    trim: true
  },
  requirements: {
    type: [String],
    required: true,
    default: []
  },
  learn: {
    type: [String],
    required: true,
    default: []
  },
  courseImage: {
    type: String 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', courseSchema);