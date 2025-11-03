const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require ('nodemailer'); 

const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ems-fe-teal.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
//your routes here, eg: 

app.use('/api/auth', require('./routes/auth'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/', require('./routes/mail'));
app.use('/api/forgot-password', require('./routes/forgotPassword'));




// Basic route for testing
app.get('/', (req, res) => res.send('EMS Backend Running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));