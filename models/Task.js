const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  deadline: { type: Date, required: true },
  assignFilePath: { type: String }, 
  status: { type: String, enum: ["Assigned", "Completed", "Progress"], default: "Assigned" },
  assignFile: { type: String },          // Original filename
  assignFileStored: { type: String },    // Stored path on server
  submitDate: { type: Date, default: null },
  submitFilePath: { type: String, default: null },
  submitFile: { type: String, default: null },
});

module.exports = mongoose.model("Task", taskSchema);
