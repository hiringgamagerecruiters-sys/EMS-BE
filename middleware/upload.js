const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Allow all file types
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
