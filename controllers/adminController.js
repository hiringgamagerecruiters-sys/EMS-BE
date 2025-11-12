const User = require("../models/User");
const DailyDiary = require("../models/DailyDiary");
const LeaveRequest = require("../models/LeaveRequest");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const CalendarEvent = require("../models/CalendarEvent");
const Course = require('../models/Course');
const Notification = require("../models/Notification");

const fs = require('fs');
const path = require('path');
const bcrypt = require("bcryptjs");
const Team = require('../models/Team');
const JobRole = require('../models/JobRole');

exports.getAllEmployees = async (req, res) => {
  try {
    const users = await User.find()
      .populate('jobRole', 'jobRoleName')
      .populate('team', 'teamName');

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllActiveEmployees = async (req, res) => {
  try {
    const users = await User.find({
      active: true,
    })
      .populate('jobRole', 'jobRoleName')
      .populate('team', 'teamName');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateEmployeesStatus = async (req, res) => {
  const { userId, status } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.active = Boolean(status);

    await user.save();

    res.json({ msg: "User status updated successfully", active: user.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.removeEmployee = async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const result = await User.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getDashboardStats = async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const totalMembers = await User.countDocuments({ active: true });
  try {
    const totalAttendance = await Attendance.countDocuments({ date: today });
    const leaveRequests = await LeaveRequest.countDocuments({
      status: "Pending",
    });
    const leave_count = await Attendance.countDocuments({
      date: today,
      status: "Leave",
    });
    const late_count = await Attendance.countDocuments({
      date: today,
      status: "Late",
    });
    const task_completion = await Task.countDocuments({ status: "Completed" });
    res.json({
      totalAttendance,
      leaveRequests,
      leave_count,
      late_count,
      task_completion,
      totalMembers
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// exports.getProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     if (!user) return res.status(404).json({ msg: "User not found" });
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ msg: "Server error" });
//   }
// };

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
    team,        // Team ID from frontend
    jobRole,     // Job Role ID from frontend
    role         // Role field for admin
  } = req.body;

  const profileImage = req.file ? req.file.filename : null;

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid current password" });

    // Update basic fields
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

    // Update role if provided (for admin)
    if (role) {
      user.role = role;
    }

    // Update profile image if provided
    if (req.file) {
      user.profileImage = req.file.path;
    }

    // Update team if provided
    if (team) {
      const teamObj = await Team.findById(team);
      if (!teamObj) return res.status(400).json({ msg: "Invalid Team ID" });
      user.team = team;
    }

    // Update job role if provided
    if (jobRole) {
      const jobRoleObj = await JobRole.findById(jobRole);
      if (!jobRoleObj) return res.status(400).json({ msg: "Invalid Job Role ID" });
      user.jobRole = jobRole;
    }

    await user.save();
    res.json({ msg: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getDiaries = async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    const diaries = await DailyDiary.find({
      $or: [{ date: today }, { diaryStatus: "Pending", date: { $ne: today } }],
    })
      .populate({
        path: "userId",
        select: "firstName lastName email profileImage nic contactNumber internStartDate internEndDate university addressLine1 addressLine2",
        populate: [
          { path: "team", select: "teamName" },
          { path: "jobRole", select: "jobRoleName" },
        ],
      });

    res.json(diaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all diaries (both Pending and Replied)
exports.getDiaries = async (req, res) => {
  try {
    const diaries = await DailyDiary.find({})
      .populate({
        path: "userId",
        select: "firstName lastName email profileImage nic contactNumber internStartDate internEndDate university addressLine1 addressLine2",
        populate: [
          { path: "team", select: "teamName" },
          { path: "jobRole", select: "jobRoleName" },
        ],
      })
      .sort({ date: -1 });

    res.json(diaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all diaries history (same as getDiaries but with repliedBy population)
exports.getDiariesHistory = async (req, res) => {
  try {
    const diaries = await DailyDiary.find({})
      .populate({
        path: "userId",
        select: "firstName lastName email profileImage nic contactNumber internStartDate internEndDate university addressLine1 addressLine2",
        populate: [
          { path: "team", select: "teamName" },
          { path: "jobRole", select: "jobRoleName" },
        ],
      })
      .populate({
        path: "repliedBy",
        select: "firstName lastName email",
      })
      .sort({ date: -1 });

    res.json(diaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Remove diary
exports.removeDiaries = async (req, res) => {
  const id = req.query.id;

  try {
    const removeDailyDiary = await DailyDiary.deleteOne({ _id: id });

    if (removeDailyDiary.deletedCount === 0) {
      return res.status(404).json({ message: "Diary not found" });
    }

    res.status(200).json({ message: "Daily Diary removed successfully" });
  } catch (error) {
    console.error("Error removing DailyDiary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update diary status and reply
// exports.updateDiaries = async (req, res) => {
//   try {
//     // Get diary ID from FormData (req.body) or fallback to query
//     const diaryId = req.body?.id || req.query?.id;
//     const status = req.query?.status || req.body?.status || "Pending";
//     const replyMessage = req.body?.replyMessage || "";
//     const replyFile = req.file;

//     if (!diaryId) {
//       return res.status(400).json({ message: "Diary ID is required" });
//     }

//     // Find the diary
//     const diary = await DailyDiary.findById(diaryId);
//     if (!diary) return res.status(404).json({ message: "Diary not found" });

//     // Update status
//     diary.diaryStatus = status;

//     // Only update reply fields if Replied
//     if (status === 'Replied') {
//       diary.replyMessage = replyMessage;
//       diary.replyDate = new Date();
//       diary.repliedBy = req.user.id; // Comes from verifyToken

//       if (replyFile) {
//         diary.replyFilePath = replyFile.path;
//         diary.replyFileName = replyFile.originalname;
//       }

//       // Send notification to user
//       await Notification.create({
//         userId: diary.userId,
//         message: `Admin has replied to your diary entry: "${diary.name}".`,
//         title: `Diary Replied`,
//         type: "diary",
//       });
//     }

//     await diary.save();
    
//     // Populate the repliedBy field before sending response
//     const updatedDiary = await DailyDiary.findById(diaryId)
//       .populate({
//         path: "repliedBy",
//         select: "firstName lastName email",
//       })
//       .populate({
//         path: "userId",
//         select: "firstName lastName email profileImage nic contactNumber internStartDate internEndDate university addressLine1 addressLine2",
//         populate: [
//           { path: "team", select: "teamName" },
//           { path: "jobRole", select: "jobRoleName" },
//         ],
//       });

//     res.status(200).json({ message: "Diary updated successfully", diary: updatedDiary });
//   } catch (err) {
//     console.error("Daily Diary update error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// Update diary status
exports.updateDiaries = async (req, res) => {
  try {
    // Get diary ID from FormData (req.body) or fallback to query
    const diaryId = req.body?.id || req.query?.id;
    const status = req.body?.status || req.query?.status || "Pending";
    const replyMessage = req.body?.replyMessage || "";
    const replyFile = req.file;

    console.log("Update request received:", { diaryId, status });

    if (!diaryId) {
      return res.status(400).json({ message: "Diary ID is required" });
    }

    // Validate status
    const validStatuses = ['Replied', 'Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be one of: Replied, Pending, Approved, Rejected" 
      });
    }

    // Find the diary
    const diary = await DailyDiary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ message: "Diary not found" });
    }

    // Update status
    diary.diaryStatus = status;

    // Only update reply fields if Replied
    if (status === 'Replied') {
      diary.replyMessage = replyMessage;
      diary.replyDate = new Date();
      diary.repliedBy = req.user.id; // Comes from verifyToken

      if (replyFile) {
        diary.replyFilePath = replyFile.path;
        diary.replyFileName = replyFile.originalname;
      }

      // Send notification to user
      await Notification.create({
        userId: diary.userId,
        message: `Admin has replied to your diary entry: "${diary.name}".`,
        title: `Diary Replied`,
        type: "diary",
      });
    } else {
      // For Approved/Rejected status, update reply date and repliedBy
      diary.replyDate = new Date();
      diary.repliedBy = req.user.id;
    }

    await diary.save();
    
    // Populate the repliedBy field before sending response
    const updatedDiary = await DailyDiary.findById(diaryId)
      .populate({
        path: "repliedBy",
        select: "firstName lastName email",
      })
      .populate({
        path: "userId",
        select: "firstName lastName email profileImage nic contactNumber internStartDate internEndDate university addressLine1 addressLine2",
        populate: [
          { path: "team", select: "teamName" },
          { path: "jobRole", select: "jobRoleName" },
        ],
      });

    res.status(200).json({ 
      message: `Diary ${status.toLowerCase()} successfully`, 
      diary: updatedDiary 
    });
  } catch (err) {
    console.error("Daily Diary update error:", err);
    res.status(500).json({ 
      message: "Internal server error",
      error: err.message 
    });
  }
};


exports.getAllEmployees = async (req, res) => {
  try {
    const users = await User.find()
      .populate('jobRole', 'jobRoleName')
      .populate('team', 'teamName');

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





exports.getLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find().populate(
      "userId",
      "firstName lastName email"
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.updateLeaveRequest = async (req, res) => {
  const { leaveId, status } = req.body;
  try {
    const leave = await LeaveRequest.findById(leaveId);
    if (!leave) return res.status(404).json({ msg: "Leave request not found" });
    leave.status = status;
    await leave.save();

      await Notification.create({
      userId: leave.userId._id,
      message: `Your leave request has been ${status}`,
      type: "leave",
    });
    res.json({ msg: "Leave request updated successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// exports.getTodayTasks = async (req, res) => {
//   try {
//     // Start of today (00:00:00)
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // Start of tomorrow (next day 00:00:00)
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     // Fetch tasks with deadline within today
//     const tasks = await Task.find({
//       deadline: { $gte: today, $lt: tomorrow },
//       status: { $in: ["Progress", "Completed", "Assigned"] }, // you can adjust statuses
//     }).populate("assignedTo", "firstName lastName email");

//     if (!tasks || tasks.length === 0) {
//       return res.status(404).json({ msg: "No tasks scheduled for today" });
//     }

//     res.status(200).json(tasks);
//   } catch (err) {
//     console.error("Error fetching today's tasks:", err.message);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


// exports.getCreatedTasks  = async (req, res) => {

//   try {
//     const tasks = await Task.find({
//       status: { $in: ['Progress','Assigned'] } 
//     }).populate(
//       "assignedTo",
//       "firstName lastName email"
//     );

//     res.json(tasks);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// exports.getTasksHistory  = async (req, res) => {

//   try {
//     const tasks = await Task.find({
//       status: { $in: ['Completed'] } 
//     }).populate(
//       "assignedTo",
//       "firstName lastName email"
//     );

//     res.json(tasks);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


// exports.removeTask = async (req, res) => {
//   const id = req.query.id;

//   try {
//     const removeTask = await Task.deleteOne({ _id: id });

//     if (removeTask.deletedCount === 0) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     res.status(200).json({ message: "Task removed successfully" });
//   } catch (error) {
//     console.error("Error removing Task:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };




exports.createTask = async (req, res) => {
  const { assignedTo, name, description, deadline, assignFilePath } = req.body;

  try {
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({ msg: "Assigned user not found" });
    }

    if (assignFilePath && !/^https?:\/\/.+\.(pdf)$/i.test(assignFilePath)) {
      return res.status(400).json({ msg: "Invalid file path. Must be a valid PDF URL." });
    }

    if (req.file && req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ msg: "Only PDF files are allowed." });
    }

    // FIX: Allow today's date for deadlines
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // midnight today

      // Allow today's date by checking if deadline is BEFORE today (not <=)
      if (deadlineDate < today) {
        return res.status(400).json({ msg: "Deadline cannot be in the past." });
      }
    }

    const task = new Task({
      assignedTo,
      name,
      description,
      deadline: deadline ? new Date(deadline) : null,
      assignFilePath: assignFilePath || null,
      assignFile: req.file ? req.file.originalname : null,
      assignFileStored: req.file ? req.file.path : null,
      status: "Assigned",
    });

    await task.save();

    // ✅ Create notification for employee
    await Notification.create({
      userId: assignedTo,
      message: `A new task "${name}" has been assigned to you.`,
      type: "task",
      title: `Task Assigned`,
    });

    res.status(201).json({ msg: "Task created successfully", task });
  } catch (err) {
    console.error("Task creation error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getTodayTasks = async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("=== TODAY'S TASKS DEBUG ===");
    console.log("Today:", today.toISOString());
    console.log("Tomorrow:", tomorrow.toISOString());

    // Query for tasks that are either:
    // 1. Due today (deadline between today and tomorrow)
    // 2. OR were created today (createdAt between today and tomorrow)
    // 3. AND have active status
    const tasks = await Task.find({
      $and: [
        {
          status: { $in: ["Assigned", "Progress", "Pending"] }
        },
        {
          $or: [
            // Tasks due today
            {
              deadline: { 
                $gte: today, 
                $lt: tomorrow 
              }
            },
            // OR tasks created today (alternative approach)
            {
              createdAt: { 
                $gte: today, 
                $lt: tomorrow 
              }
            }
          ]
        }
      ]
    })
    .populate("assignedTo", "firstName lastName email profileImage")
    .sort({ deadline: 1, createdAt: -1 });

    console.log(`\n=== TODAY'S TASKS RESULT (${tasks.length}) ===`);
    tasks.forEach(task => {
      const isDueToday = task.deadline && task.deadline >= today && task.deadline < tomorrow;
      const isCreatedToday = task.createdAt && task.createdAt >= today && task.createdAt < tomorrow;
      
      console.log(`✓ ${task.name} | ` +
        `Deadline: ${task.deadline} | ` +
        `Created: ${task.createdAt} | ` +
        `Due Today: ${isDueToday} | ` +
        `Created Today: ${isCreatedToday} | ` +
        `Status: ${task.status}`);
    });

    res.status(200).json(tasks || []);
  } catch (err) {
    console.error("Error fetching today's tasks:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCreatedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      status: { $in: ['Progress', 'Assigned', 'Pending'] } 
    })
    .populate("assignedTo", "firstName lastName email profileImage")
    .sort({ createdAt: -1 });

    res.status(200).json(tasks || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTasksHistory = async (req, res) => {
  try {
    const tasks = await Task.find({
      status: { $in: ['Completed'] } 
    })
    .populate("assignedTo", "firstName lastName email profileImage")
    .sort({ submitDate: -1, deadline: -1 });

    res.status(200).json(tasks || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.removeTask = async (req, res) => {
  const id = req.query.id;

  try {
    const removeTask = await Task.deleteOne({ _id: id });

    if (removeTask.deletedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task removed successfully" });
  } catch (error) {
    console.error("Error removing Task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.createCalendarEvent = async (req, res) => {
  const { date, isLeaveDay, description } = req.body;
  try {
    const event = new CalendarEvent({ date, isLeaveDay, description });
    await event.save();
    res.json({ msg: "Calendar event created successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getCalendarEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deactivateUser = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.active = false;
    await user.save();

    res.json({
      msg: `User ${user.firstName} ${user.lastName} has been deactivated`,
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getUsersByStatus = async (req, res) => {
  const { status } = req.query;

  try {
    let filter = {};
    if (status === "active") {
      filter.active = true;
    } else if (status === "inactive") {
      filter.active = false;
    }

    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// exports.getLearningResource = async (req, res) => {
//   try {
//     const positionCounts = await User.aggregate([
//       {
//         $group: {
//           _id: "$category",           
//           count: { $sum: 1 }         
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           position: "$_id",
//           count: 1
//         }
//       }
//     ]);

//     res.json(positionCounts);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


exports.getLearningResource = async (req, res) => {
  try {
    // Get user categories with counts
    const userCategories = await User.aggregate([
      {
        $group: {
          _id: "$category",           
          count: { $sum: 1 }         
        }
      },
      {
        $project: {
          _id: 0,
          position: "$_id",
          count: 1,
          type: "category"
        }
      }
    ]);

    // Get job roles with user counts - FIXED
    const jobRoles = await JobRole.find({});
    const jobRolesWithCount = await Promise.all(
      jobRoles.map(async (role) => {
        const userCount = await User.countDocuments({ jobRole: role._id }); // Fixed: query by ObjectId
        return {
          position: role.jobRoleName,
          count: userCount,
          type: "jobRole",
          _id: role._id
        };
      })
    );

    // Get teams with user counts - FIXED
    const teams = await Team.find({});
    const teamsWithCount = await Promise.all(
      teams.map(async (team) => {
        const userCount = await User.countDocuments({ team: team._id }); // Fixed: query by ObjectId
        return {
          position: team.teamName,
          count: userCount,
          type: "team", 
          _id: team._id
        };
      })
    );

    // Combine all data
    const combinedData = [
      ...userCategories,
      ...jobRolesWithCount,
      ...teamsWithCount
    ].filter(item => item.position && item.position !== null && item.position !== undefined);

    res.json(combinedData);
  } catch (err) {
    console.error("Error in getLearningResource:", err);
    res.status(500).json({ 
      msg: "Server error",
      error: err.message 
    });
  }
};


exports.getAttendanceSheet = async (req, res) => {
  try {
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    

    const attendance = await Attendance.find({
      date: {
        $gte: new Date(today),
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('userId', 'firstName lastName employeeId profileImage contactNumber group university '); 

    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getAttendanceHistorySheet = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate({
        path: 'userId',
        select: 'firstName lastName email employeeId profileImage contactNumber university',
        populate: {
          path: 'team',
          select: 'teamName'
        }
      })
      .sort({ date: -1 }); 
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getResourceItems = async (req, res) => {
  const position = req.params.category;

  try {
    console.log("🔍 Fetching resource items for:", position);
    
    let users = [];

    // Check if it's a job role
    const jobRole = await JobRole.findOne({ 
      jobRoleName: { $regex: new RegExp(`^${position}$`, 'i') } 
    });

    // Check if it's a team
    const team = await Team.findOne({ 
      teamName: { $regex: new RegExp(`^${position}$`, 'i') } 
    });

    if (jobRole) {
      console.log(`📋 Found job role: ${jobRole.jobRoleName}`);
      // Find users with this job role ID - FIXED: use ObjectId
      users = await User.find({ jobRole: jobRole._id })
        .populate('jobRole', 'jobRoleName')
        .populate('team', 'teamName')
        .select('firstName lastName email role contactNumber profileImage userCode university');
    } 
    else if (team) {
      console.log(`👥 Found team: ${team.teamName}`);
      // Find users with this team ID - FIXED: use ObjectId
      users = await User.find({ team: team._id })
        .populate('jobRole', 'jobRoleName')
        .populate('team', 'teamName')
        .select('firstName lastName email role contactNumber profileImage userCode university');
    } 
    else {
      console.log(`📝 Treating as category: ${position}`);
      // Treat as category (original behavior)
      users = await User.find({ category: position })
        .populate('jobRole', 'jobRoleName')
        .populate('team', 'teamName')
        .select('firstName lastName email role contactNumber profileImage userCode university');
    }

    console.log(`✅ Found ${users.length} users for: ${position}`);
    
    // Transform the data to match expected format
    const transformedUsers = users.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
      userCode: user.userCode,
      university: user.university,
      // Additional fields that might be useful
      jobRole: user.jobRole?.jobRoleName || 'Not assigned',
      team: user.team?.teamName || 'Not assigned'
    }));

    res.status(200).json(transformedUsers);
  } catch (err) {
    console.error('❌ Error fetching resource items:', err);
    res.status(500).json({ 
      message: 'Error fetching resources', 
      error: err.message 
    });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const requirements = Array.isArray(req.body.requirements) 
      ? req.body.requirements 
      : [req.body.requirements].filter(Boolean);
    
    const learn = Array.isArray(req.body.learn) 
      ? req.body.learn 
      : [req.body.learn].filter(Boolean);

    let courseImagePath = null;
    if (req.file) {
      const fullPath = req.file.path;
      const parts = fullPath.split('uploads');
      courseImagePath = 'uploads' + parts[parts.length - 1];
    }

    const courseData = {
      courseTitle: req.body.courseTitle,
      courseDescription: req.body.courseDescription,
      requirements,
      learn,
      courseImage: courseImagePath
    };

    const newCourse = new Course(courseData);
    const savedCourse = await newCourse.save();

    res.status(201).json({
      success: true,
      data: savedCourse
    });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// In your admin controller file
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const requirements = Array.isArray(req.body.requirements) 
      ? req.body.requirements 
      : [req.body.requirements].filter(Boolean);
    
    const learn = Array.isArray(req.body.learn) 
      ? req.body.learn 
      : [req.body.learn].filter(Boolean);

    let courseImagePath = null;
    if (req.file) {
      const fullPath = req.file.path;
      const parts = fullPath.split('uploads');
      courseImagePath = 'uploads' + parts[parts.length - 1];
    }

    const updateData = {
      courseTitle: req.body.courseTitle,
      courseDescription: req.body.courseDescription,
      requirements,
      learn,
    };

    if (courseImagePath) {
      updateData.courseImage = courseImagePath;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCourse
    });
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getPendingLeaveRequests = async (req, res) => {
   try {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 

    const allRequests = await LeaveRequest.find({
      leaveDate: { $gt: today },
    }).populate("userId", "profileImage firstName lastName email contactNumber group university jobRole ");

    const withDays = allRequests.map((leave) => {
      const start = new Date(leave.leaveDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        ...leave._doc,
        days: diffDays,
      };
    });

    res.json(withDays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};



exports.getAllLeaveRequests = async (req, res) => {
  try {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 

    const allRequests = await LeaveRequest.find({
      leaveDate: { $lt: today }, 
    }).populate("userId", "profileImage firstName lastName email contactNumber group university jobRole ");

    const withDays = allRequests.map((leave) => {
      const start = new Date(leave.leaveDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        ...leave._doc,
        days: diffDays,
      };
    });

    res.json(withDays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getActiveLeavesByDate = async (req, res) => {
  try {
    const date = req.query.date;
    const targetDate = new Date(date);

    const leaves = await LeaveRequest.find({
      leaveDate: { $lte: targetDate },
      endDate: { $gte: targetDate },
      status: "Approved", 
    }).populate("userId", "profileImage firstName lastName email contactNumber group university jobRole ");

    const withDays = leaves.map((leave) => {
      const start = new Date(leave.leaveDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        ...leave._doc,
        days: diffDays,
      };
    });

    res.status(200).json(withDays);
  } catch (err) {
    console.error("Leave filter error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.updateActiveLeaves = async (req, res) => {
//   const id = req.query.id;
//   const status = req.query.status;

//   try {
   
//     if (!["Approved", "Rejected", "Pending"].includes(status)) {
//       return res.status(400).json({ message: "Invalid status" });
//     }

//     const updatedLeave = await LeaveRequest.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true }
//     ).populate("userId");

//     if (!updatedLeave) {
//       return res.status(404).json({ message: "Leave request not found" });
//     }

//     res.status(200).json(updatedLeave);
//   } catch (err) {
//     console.error("Leave update error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.updateActiveLeaves = async (req, res) => {
  const id = req.query.id;
  const status = req.query.status;
  const rejectionReason = req.body?.rejectionReason;

  try {
    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { status };
    
    // Add rejection reason if provided
    if (status === "Rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedLeave = await LeaveRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("userId");

    if (!updatedLeave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Send notification to user
    if (status === "Approved" || status === "Rejected") {
      await Notification.create({
        userId: updatedLeave.userId._id,
        message: `Your leave request has been ${status.toLowerCase()}${rejectionReason ? `: ${rejectionReason}` : ''}`,
        type: "leave",
      });
    }

    res.status(200).json(updatedLeave);
  } catch (err) {
    console.error("Leave update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



exports.removeActiveLeaves = async (req, res) => {
  const id = req.query.id;

  try {
    const removeLeave = await LeaveRequest.deleteOne({ _id: id });

    if (removeLeave.deletedCount === 0) {
      return res.status(404).json({ message: "Leave not found" });
    }

    res.status(200).json({ message: "Leave removed successfully" });
  } catch (error) {
    console.error("Error removing leave:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const id = req.query.id;
  const status = req.query.status;

  try {
   
    if (!["Assigned", "Completed", "Progress"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateTask = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("assignedTo");

    if (!updateTask) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.status(200).json(updateTask);
  } catch (err) {
    console.error("Leave update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateProfileImg = async (req, res) => {
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (req.file) {
      user.profileImage = req.file.filename;
      await user.save();
      return res.json({ msg: "Profile image updated", filename: req.file.filename });
    } else {
      return res.status(400).json({ msg: "No file uploaded" });
    }

  } catch (err) {
    console.error("Failed to update profile image:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

//team creation CRUD part.
// In your admin controller file (where you have the team CRUD operations)

exports.createTeam = async (req, res) => {
    try {
        const { teamName } = req.body;

        if (!teamName) return res.status(400).json({ message: 'Team name is required' });

        // Validate team name (should not be only numbers)
        const numbersOnlyRegex = /^\d+$/;
        if (numbersOnlyRegex.test(teamName)) {
            return res.status(400).json({ 
                message: 'Team Name Not in Correct format',
                error: 'Team name cannot contain only numbers'
            });
        }

        // Check if team already exists
        const existingTeam = await Team.findOne({ 
            teamName: { $regex: new RegExp(teamName, 'i') } 
        });
        
        if (existingTeam) {
            return res.status(400).json({ 
                message: 'Team already exists',
                error: 'A team with this name already exists'
            });
        }

        const team = new Team({ teamName });
        await team.save();

        res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
        console.error('Team creation error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find();
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

exports.updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamName } = req.body;

        if (!teamName) {
            return res.status(400).json({ message: 'Team name is required' });
        }

        // Validate team name (should not be only numbers)
        const numbersOnlyRegex = /^\d+$/;
        if (numbersOnlyRegex.test(teamName)) {
            return res.status(400).json({ 
                message: 'Team Name Not in Correct format',
                error: 'Team name cannot contain only numbers'
            });
        }

        // Check if team already exists (excluding current one)
        const existingTeam = await Team.findOne({ 
            teamName: { $regex: new RegExp(teamName, 'i') },
            _id: { $ne: id }
        });
        
        if (existingTeam) {
            return res.status(400).json({ 
                message: 'Team already exists',
                error: 'A team with this name already exists'
            });
        }

        const updatedTeam = await Team.findByIdAndUpdate(
            id,
            { teamName },
            { new: true, runValidators: true }
        );

        if (!updatedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.status(200).json({ 
            message: 'Team updated successfully', 
            team: updatedTeam 
        });
    } catch (error) {
        console.error('Team update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any user is assigned to this team
        const usersWithTeam = await User.countDocuments({ team: id });
        
        if (usersWithTeam > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete team',
                error: `There are ${usersWithTeam} users assigned to this team. Please reassign them before deleting.`
            });
        }

        const deletedTeam = await Team.findByIdAndDelete(id);

        if (!deletedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.status(200).json({ 
            message: 'Team deleted successfully',
            deletedTeam
        });
    } catch (error) {
        console.error('Team deletion error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

//job role creation CRUD part.
exports.createJobRole = async (req, res) => {
    try {
        const { jobRoleName } = req.body;

        if (!jobRoleName) {
            return res.status(400).json({ message: 'Job role name is required' });
        }

        // Validate job role name format (should not be only numbers)
        const numbersOnlyRegex = /^\d+$/;
        if (numbersOnlyRegex.test(jobRoleName)) {
            return res.status(400).json({ 
                message: 'Job Name Not in Correct format',
                error: 'Job role name cannot contain only numbers'
            });
        }

        // Check if job role already exists
        const existingJobRole = await JobRole.findOne({ 
            jobRoleName: { $regex: new RegExp(jobRoleName, 'i') } 
        });
        
        if (existingJobRole) {
            return res.status(400).json({ 
                message: 'Job role already exists',
                error: 'A job role with this name already exists'
            });
        }

        const jobRole = new JobRole({ jobRoleName });
        await jobRole.save();

        res.status(201).json({ message: 'Job role created successfully', jobRole });
    } catch (error) {
        console.error('Job role creation error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


exports.getAllJobRoles = async (req, res) => {
    try {
        const jobRoles = await JobRole.find();
        res.status(200).json(jobRoles);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

exports.updateJobRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { jobRoleName } = req.body;

        if (!jobRoleName) {
            return res.status(400).json({ message: 'Job role name is required' });
        }

        // Validate job role name format (should not be only numbers)
        const numbersOnlyRegex = /^\d+$/;
        if (numbersOnlyRegex.test(jobRoleName)) {
            return res.status(400).json({ 
                message: 'Job Name Not in Correct format',
                error: 'Job role name cannot contain only numbers'
            });
        }

        // Check if job role already exists (excluding current one)
        const existingJobRole = await JobRole.findOne({ 
            jobRoleName: { $regex: new RegExp(jobRoleName, 'i') },
            _id: { $ne: id }
        });
        
        if (existingJobRole) {
            return res.status(400).json({ 
                message: 'Job role already exists',
                error: 'A job role with this name already exists'
            });
        }

        const updatedJobRole = await JobRole.findByIdAndUpdate(
            id,
            { jobRoleName },
            { new: true, runValidators: true }
        );

        if (!updatedJobRole) {
            return res.status(404).json({ message: 'Job role not found' });
        }

        res.status(200).json({ 
            message: 'Job role updated successfully', 
            jobRole: updatedJobRole 
        });
    } catch (error) {
        console.error('Job role update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteJobRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any user is assigned to this job role
        const usersWithJobRole = await User.countDocuments({ jobRole: id });
        
        if (usersWithJobRole > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete job role',
                error: `There are ${usersWithJobRole} users assigned to this job role. Please reassign them before deleting.`
            });
        }

        const deletedJobRole = await JobRole.findByIdAndDelete(id);

        if (!deletedJobRole) {
            return res.status(404).json({ message: 'Job role not found' });
        }

        res.status(200).json({ 
            message: 'Job role deleted successfully',
            deletedJobRole
        });
    } catch (error) {
        console.error('Job role deletion error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};






// ================== Notifications ==================

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [{ userId: req.user.id }, { target: 'all' }]
    })
      .sort({ date: -1 })
      .limit(30);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Mark single notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ msg: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Clear all notifications for logged-in user
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ msg: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Send notification to all users
// exports.sendNotificationToAll = async (req, res) => {
//   try {
//     const { title, message } = req.body;

//     if (!title || !message) {
//       return res.status(400).json({ message: "Title and message are required" });
//     }

//     const users = await User.find({});

//     const notifications = users.map(user => ({
//       userId: user._id,
//       title,
//       message,
//       date: new Date(),
//       read: false
//     }));

//     await Notification.insertMany(notifications);

//     res.status(200).json({ message: "Notification sent to all users" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// Send notification to all users
exports.sendNotificationToAll = async (req, res) => {
  try {
    const { title, message } = req.body;
    const senderId = req.user.id; // Get the admin user ID from the token

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const users = await User.find({});

    const notifications = users.map(user => ({
      userId: user._id,
      senderId: senderId, // Store who sent this notification
      title,
      message,
      date: new Date(),
      read: false,
      target: 'all'
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({ message: "Notification sent to all users" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

