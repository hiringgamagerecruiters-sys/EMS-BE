const User = require("../models/User");
const Task = require("../models/Task");

const Attendance = require("../models/Attendance");
const Team = require("../models/Team");
const JobRole = require("../models/JobRole");
const DailyDiary = require("../models/DailyDiary");
const LeaveRequest = require("../models/LeaveRequest");
const Courses = require("../models/Course")
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');



exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select("-password")
      .populate("jobRole", "jobRoleName") // Populate jobRole
      .populate("team", "teamName");      // Populate team

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.id,
      status: { $in: ["Progress", "Assigned"] },
    }).sort({ deadline: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }).sort({
      deadline: 1,
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.submitTask = async (req, res) => {
  const { id, submitDate, submitFilePath, submitFile, status } = req.body;
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    task.submitDate = submitDate || new Date().toISOString().split("T")[0];
    task.submitFilePath = submitFilePath || null;
    task.submitFile = req.file ? req.file.path : submitFile || null;
    task.status = status || "Completed";

    await task.save();

    //  notify admin
    await Notification.create({
      userId: task.assignedTo,
      message: `Task "${task.name}" has been submitted.`,
      type: "task",
    });

    res.status(200).json({ msg: "Task submitted successfully", task });
  } catch (err) {
    console.error("❌ submitTask error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.submitTask = async (req, res) => {
  const { taskId } = req.body;
  try {
    // match task by ID AND assignedTo includes the current user
    const task = await Task.findOne({
      _id: taskId,
      assignedTo: req.user.id,
    });

    if (!task)
      return res
        .status(404)
        .json({ msg: "Task not found or not assigned to you" });

    task.status = "Completed";
    task.assignFile = req.file ? req.file.path : null;
    await task.save();

    res.json({ msg: "Task submitted successfully" });
  } catch (err) {
    console.error("❌ submitTask error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentTime = new Date();
    const currentDate = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Checking attendance for user ${userId} on ${currentDate}`);

    // Check if attendance already exists for today
    const existingAttendance = await Attendance.findOne({
      userId: userId,
      date: currentDate
    });

    if (existingAttendance) {
      console.log(`❌ Attendance already exists for today: ${existingAttendance._id}`);
      return res.status(409).json({
        message: "Attendance already recorded for today",
        existingRecord: existingAttendance
      });
    }

    // Calculate status based on time - FIXED LOGIC
    const checkInHour = currentTime.getHours();
    const checkInMinutes = currentTime.getMinutes();
    const totalMinutes = checkInHour * 60 + checkInMinutes;
    
    // Define time thresholds
    const ON_TIME_THRESHOLD = 8 * 60 + 15; // 8:15 AM in minutes
    const LATE_THRESHOLD = 9 * 60; // 9:00 AM in minutes
    
    let status = 'Attended';
    
    if (totalMinutes <= ON_TIME_THRESHOLD) {
      status = 'Attended'; // On Time (before 8:15 AM)
    } else if (totalMinutes <= LATE_THRESHOLD) {
      status = 'Late'; // Late (8:16 AM - 9:00 AM)
    } else {
      status = 'Late'; // Very Late (after 9:00 AM)
    }

    console.log(`🕒 Check-in time: ${checkInHour}:${checkInMinutes}, Status: ${status}`);

    // Create new attendance record
    const attendance = new Attendance({
      userId: userId,
      date: currentDate,
      time: currentTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      status: status,
      checkInTime: currentTime
    });

    await attendance.save();
    
    console.log(`✅ Attendance recorded successfully: ${attendance._id}`);

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance: {
        time: attendance.time,
        status: attendance.status,
        date: attendance.date
      }
    });

  } catch (error) {
    console.error("❌ Attendance marking error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Check today's attendance
exports.checkTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      userId: userId,
      date: currentDate
    });

    res.json({
      attendance: attendance || null,
      message: attendance ? 'Attendance found for today' : 'No attendance recorded today'
    });
  } catch (error) {
    console.error("Error checking today's attendance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getIsAttend = async (req, res) => {
  try {
    const { date } = req.body || req.query;

    const attendance = await Attendance.findOne({
      userId: req.user.id,
      date: date,
      key: 1,
    });

    if (attendance) {
      return res.status(200).json({ attendance });
    } else {
      return res.status(200).json({ attended: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const history = await Attendance.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.status(200).json(history);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        message: "Error fetching attendance history",
        error: err.message,
      });
  }
};



exports.submitDiary = async (req, res) => {
  console.log("submitDiary is ok");
  const {
    id,
    name,
    description,
    date,
    diaryStatus,
    assignFilePath,
    filePathLink,
  } = req.body;

  console.log("file path is : ", assignFilePath);

  try {
    const diary = new DailyDiary({
      userId: id, // changed from req.user.id
      name,
      description,
      date: date || new Date(),
      filePath: req.file ? req.file.path : null,
      diaryStatus,
      filePathLink: filePathLink || null,
    });

    console.log("file path is : ", diary);

    await diary.save();
    res.status(200).json({ msg: "Diary submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// exports.applyLeave = async (req, res) => {
//   const { name, email, leaveDate, reason, endDate } = req.body;
//   try {
//     const leave = new LeaveRequest({
//       userId: req.user.id,
//       name,
//       email,
//       leaveDate,
//       endDate,
//       reason,
//     });
//     await leave.save();
//     res.json({ msg: "Leave request submitted successfully" });
//   } catch (err) {
//     res.status(500).json({ msg: "Server error" });
//   }
// };


// Add this function to your existing exports
exports.getLeaveHistory = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user.id })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1, leaveDate: -1 });
    
    res.status(200).json(leaves);
  } catch (err) {
    console.error("Leave history fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Also update the applyLeave function to include better validation
exports.applyLeave = async (req, res) => {
  try {
    const { leaveDate, endDate, reason } = req.body;
    
    // Validate required fields
    if (!leaveDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Validate dates
    const start = new Date(leaveDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    
    if (start < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ message: "Leave date cannot be in the past" });
    }

    const leave = new LeaveRequest({
      userId: req.user.id,
      leaveDate: start,
      endDate: end,
      reason,
      status: 'Pending'
    });
    
    await leave.save();
    
    // Populate the response
    const populatedLeave = await LeaveRequest.findById(leave._id)
      .populate('userId', 'firstName lastName email');
    
    res.status(201).json({ 
      message: "Leave request submitted successfully",
      leave: populatedLeave 
    });
  } catch (err) {
    console.error("Leave application error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    dob,
    nic,
    internStartDate,
    internEndDate,
    contactNumber,
    category,
    password,
    group,
    university,
    addressLine1,
    addressLine2,
    team,        // This should be the team ID
    jobRole,     // This should be the job role ID
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 🔐 Verify current password before update
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid current password" });

    // ✅ Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.dob = dob || user.dob;
    user.nic = nic || user.nic;
    user.internStartDate = internStartDate || user.internStartDate;
    user.internEndDate = internEndDate || user.internEndDate;
    user.contactNumber = contactNumber || user.contactNumber;
    user.category = category || user.category;
    user.group = group || user.group;
    user.university = university || user.university;
    user.addressLine1 = addressLine1 || user.addressLine1;
    user.addressLine2 = addressLine2 || user.addressLine2;

    if (req.file) {
      user.profileImage = req.file.path;
    }

    // ✅ Update Team if provided
    if (team) {
      const teamObj = await Team.findById(team);
      if (!teamObj) return res.status(400).json({ msg: "Invalid Team ID" });
      user.team = team;
    }

    // ✅ Update Job Role if provided
    if (jobRole) {
      const jobRoleObj = await JobRole.findById(jobRole);
      if (!jobRoleObj) return res.status(400).json({ msg: "Invalid Job Role ID" });
      user.jobRole = jobRole;
    }

    await user.save();
    res.json({ msg: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.attendanceOverView = async (req, res) => {
  const userId = req.params.id;

  try {
    const attended_count = await Attendance.countDocuments({
      userId,
      status: "Attended",
    });
    const leave_count = await Attendance.countDocuments({
      userId,
      status: "Leave",
    });
    const late_count = await Attendance.countDocuments({
      userId,
      status: "Late",
    });

    res
      .status(200)
      .json({
        userId,
        totalAttendance: attended_count,
        totalLeave: leave_count,
        totalLate: late_count,
      });
  } catch (err) {
    console.error("Error counting attendance:", err);
    res.status(500).json({ message: "Error counting attendance" });
  }
};

exports.submitTask = async (req, res) => {
  console.log("submitTask is : ", req.body);

  const { id, submitDate, submitFilePath, submitFile, status, file } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Update fields
    task.submitDate = submitDate || new Date().toISOString().split("T")[0];
    task.submitFilePath = submitFilePath || null;
    (task.submitFile = req.file ? req.file.path : submitFile || null),
      (task.status = status || "Completed");

    await task.save();

    res.status(200).json({ msg: "Task submitted successfully", task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.acceptTask = async (req, res) => {
  const { id, status } = req.query;

  try {
    const taskAccept = await Task.findById(id);

    if (!taskAccept) {
      return res.status(404).json({ msg: "Task not found" });
    }

    taskAccept.status = status;

    await taskAccept.save();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Courses.find().sort({
      deadline: 1,
    });
    res.status(200).json({ msg: "courses fetch successfully", courses });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
}

exports.getCourseDetails = async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDiaries = async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const userId = req.params.id; // Make sure you're passing this correctly

  try {
    const diaries = await DailyDiary.find({
      userId,
      
    })
      .populate(
        "userId",
        "firstName lastName email profileImage nic contactNumber category internStartDate internEndDate group university addressLine1 addressLine2"
      )
      .sort({ date: -1 }); 

    res.json(diaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteDiary = async (req, res) => {
  const diaryId = req.params.id;

  try {
    const diary = await DailyDiary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ msg: "Diary not found" });
    }

    await diary.deleteOne(); // ✅ Replaces diary.remove()
    res.status(200).json({ msg: "Diary deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getUserLeaveRequests = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user.id })
      .select('leaveDate endDate reason status')
      .sort({ leaveDate: -1 });

    res.status(200).json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Error fetching leave requests',
      error: err.message,
    });
  }
};

// exports.getMyNotifications = async (req, res) => {
//   try {
//     const notifications = await Notification.find({
//       $or: [
//         { userId: req.user.id }, // personal
//         { target: 'all' }        // global
//       ]
//     }).sort({ date: -1 });

//     // Count unread personal notifications
//     const unreadCount = notifications.filter(n => !n.read && n.target === 'user').length;

//     res.status(200).json({ notifications, unreadCount });
//   } catch (err) {
//     console.error("❌ getMyNotifications error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { userId: req.user.id }, // personal
        { target: 'all' }        // global
      ]
    })
    .populate('senderId', 'firstName lastName userCode') // Populate sender details
    .sort({ date: -1 });

    // Count unread personal notifications
    const unreadCount = notifications.filter(n => !n.read && n.target === 'user').length;

    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    console.error("❌ getMyNotifications error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Mark personal notification as read
exports.readNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id }, // only personal
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found or not personal" });
    }

    res.status(200).json({ msg: "Notification marked as read", notification });
  } catch (err) {
    console.error("❌ readNotification error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
