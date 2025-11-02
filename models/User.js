const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userCode: { type: String, unique: true }, // ADM001, EMP001, etc.
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  dob: { type: Date },
  nic: { type: String, unique: true },
  role: { type: String, enum: ['employee', 'admin'], default: 'employee' },
  profileImage: { type: String },
  internStartDate: { type: Date },
  internEndDate: { type: Date },
  active: { type: Boolean, default: true },
  jobRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRole',
    required: false
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false
  },
  university: { type: String },
  addressLine1: { type: String },
  addressLine2: { type: String },
}, { timestamps: true });

// Pre-save middleware to generate user code
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = this.role === 'admin' ? 'ADM' : 'INT';
    const lastUser = await this.constructor
      .findOne({ role: this.role })
      .sort({ userCode: -1 });
    
    let nextNumber = 1;
    if (lastUser && lastUser.userCode) {
      const lastCode = lastUser.userCode;
      const lastNumber = parseInt(lastCode.slice(3)) || 0;
      nextNumber = lastNumber + 1;
    }
    
    this.userCode = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);