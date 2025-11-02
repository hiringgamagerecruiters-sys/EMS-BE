const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token' });
  }
};

// Admin Check Middleware
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin Access Required' });
  }
  next();
};


const isValidUser = async (req, res, next) => {

  const user = await User.findOne(req.user.email);
  
  if(user.active === false){
     return res.status(401).json({ message: 'User no longer valide' });
  }
next();
};

module.exports = { verifyToken, isAdmin, isValidUser };