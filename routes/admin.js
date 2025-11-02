const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isValidUser } = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');
const imgupload = require('../config/multer');
//router.use(verifyToken);

router.get('/dashboard', verifyToken, adminController.getDashboardStats);
router.get('/profile', verifyToken, adminController.getProfile);
router.put('/profile', upload.single('profileImage'), verifyToken, adminController.updateProfile);
// Diary routes
router.get('/diaries', verifyToken, adminController.getDiaries);
router.get('/diaries_history', verifyToken, adminController.getDiariesHistory);
router.put("/diaries/update", verifyToken, upload.single('file'), adminController.updateDiaries);
router.delete('/remove_diarie', verifyToken, isAdmin, adminController.removeDiaries);
router.get('/leaves', verifyToken, adminController.getLeaveRequests);
router.put('/leaves', verifyToken, adminController.updateLeaveRequest);
router.get("/leaves/history", verifyToken, adminController.getAllLeaveRequests);
router.get("/leaves/pending", verifyToken, adminController.getPendingLeaveRequests);
router.put("/leaves/update", verifyToken, adminController.updateActiveLeaves);
router.put("/leaves/remove", verifyToken, adminController.removeActiveLeaves);
router.post('/create_tasks', upload.single('file'), verifyToken, adminController.createTask);
router.get('/today_tasks', verifyToken, adminController.getTodayTasks);
router.get('/created_tasks', verifyToken, adminController.getCreatedTasks);
router.get('/tasks_history', verifyToken, adminController.getTasksHistory);
router.put('/update_tasks_staus', verifyToken, adminController.updateTaskStatus);
router.delete('/remove_task', verifyToken, adminController.removeTask);
router.post('/calendar', verifyToken, adminController.createCalendarEvent);
router.get('/calendar', verifyToken, adminController.getCalendarEvents);
router.get('/attendance_sheet', verifyToken, isAdmin, adminController.getAttendanceSheet);
router.get('/attendance_history_sheet',verifyToken ,isAdmin, adminController.getAttendanceHistorySheet);

router.put('/:id/deactivate', verifyToken, isAdmin, adminController.deactivateUser);
router.get('/users', verifyToken, isAdmin, adminController.getUsersByStatus);
router.get('/all_users', verifyToken, isAdmin, adminController.getAllEmployees);
router.get('/all_active_users', verifyToken, isAdmin, adminController.getAllActiveEmployees);
router.delete('/remove_user', verifyToken, isAdmin, adminController.removeEmployee);
router.delete('/remove_diarie', verifyToken, isAdmin, adminController.removeDiaries);
router.put('/update_user_status', verifyToken, isAdmin, adminController.updateEmployeesStatus);
router.get('/learning_resource', verifyToken, isAdmin, adminController.getLearningResource);
router.get('/resourceItems/:category', verifyToken, isAdmin, adminController.getResourceItems);
router.post('/course', imgupload.single('courseImage'), verifyToken, adminController.createCourse);
router.get('/courses', verifyToken, adminController.getAllCourses);
router.put('/course/:id', verifyToken, imgupload.single('courseImage'), adminController.updateCourse);
router.delete('/course/:id', verifyToken, adminController.deleteCourse);
router.put('/upload-avatar', imgupload.single('profileImage'), verifyToken, adminController.updateProfileImg);

// Team Routes
router.post('/teams', verifyToken, isAdmin, adminController.createTeam);
router.get('/teams', adminController.getAllTeams);
router.put('/teams/:id', verifyToken, isAdmin, adminController.updateTeam);
router.delete('/teams/:id', verifyToken, isAdmin, adminController.deleteTeam);

// Job Role Routes
router.post('/job-roles', verifyToken, isAdmin, adminController.createJobRole);
router.get('/job-roles', adminController.getAllJobRoles);
router.put('/job-roles/:id', verifyToken, isAdmin, adminController.updateJobRole);
router.delete('/job-roles/:id', verifyToken, isAdmin, adminController.deleteJobRole);

router.get('/leave/leaveByDay', verifyToken, isAdmin, adminController.getActiveLeavesByDate);



router.post('/notifications/send', verifyToken, isAdmin, adminController.sendNotificationToAll);

router.get('/notifications', verifyToken, adminController.getNotifications);
router.put('/notifications/:id/read', verifyToken, adminController.markNotificationAsRead);
router.delete('/notifications/clear', verifyToken, adminController.clearNotifications);

module.exports = router;