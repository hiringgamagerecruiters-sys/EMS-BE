const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema({
    jobRoleName: { type: String, required: true, trim: true },
});

module.exports = mongoose.model('JobRole', jobRoleSchema);