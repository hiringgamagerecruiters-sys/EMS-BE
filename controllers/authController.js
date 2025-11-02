const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const JobRole = require('../models/JobRole');

exports.register = async (req, res) => {
  const {
    firstName, lastName, email,
    contactNumber, dob, nic, password,
    internStartDate, internEndDate,
    role, active, jobRole, team,
    university, addressLine1, addressLine2
  } = req.body;

  const profileImage = req.file ? req.file.filename : null;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    // For admin registration, team and jobRole might be optional
    if (team) {
      const existingTeam = await Team.findById(team);
      if (!existingTeam) {
        return res.status(400).json({ msg: 'Invalid team. Please select an existing team.' });
      }
    }

    if (jobRole) {
      const existingJobRole = await JobRole.findById(jobRole);
      if (!existingJobRole) {
        return res.status(400).json({ msg: 'Invalid job role. Please select an existing job role.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      contactNumber,
      dob,
      nic,
      role: role || 'employee',   
      profileImage,
      internStartDate,
      internEndDate,
      jobRole: jobRole || null,
      active: active === "true" || active === true,   
      team: team || null,
      university,
      addressLine1,
      addressLine2
    });

    await user.save();
    
    // Fetch the saved user to get the generated userCode
    const savedUser = await User.findById(user._id);
    
    res.json({ 
      msg: 'User registered successfully', 
      user: savedUser 
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.nic) {
        return res.status(400).json({ msg: 'NIC already exists' });
      }
      if (err.keyPattern?.userCode) {
        // Retry saving if userCode conflict (rare case)
        return res.status(400).json({ msg: 'User code conflict. Please try again.' });
      }
    }

    console.error('❌ Registration error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    if (user.active === false) {
      return res.status(403).json({ msg: 'Account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ 
      id: user._id, 
      role: user.role,
      userCode: user.userCode 
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      token, 
      role: user.role, 
      id: user._id,
      userCode: user.userCode,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body.passwordForm;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};