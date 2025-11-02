const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const employeeController = require('../controllers/employeeController');


router.use(verifyToken);



router.get('/profile', employeeController.getProfile);
router.post('/attendance', employeeController.markAttendance);
router.get('/attendance/history', employeeController.getAttendanceHistory);
router.post('/diary', upload.single('file'), employeeController.submitDiary);
router.get('/diaries/:id', employeeController.getDiaries);
router.delete('/diaries/:id', employeeController.deleteDiary);
router.post('/leave', employeeController.applyLeave);
router.get('/tasks', employeeController.getTasks);
router.get('/all_tasks', employeeController.getAllTasks);
router.post('/tasks/submit', upload.single('file'), employeeController.submitTask);
router.put('/task/submit_tasks', upload.single('file'), employeeController.submitTask);
router.put('/task/accept_tasks', employeeController.acceptTask);
router.put('/profile', upload.single('profileImage'), employeeController.updateProfile);
router.get('/attendance_mark/:id', employeeController.attendanceOverView);
router.get('/is_attendance', employeeController.getIsAttend);
router.get('/all_courses', employeeController.getAllCourses);
router.get('/course/:id', employeeController.getCourseDetails);
router.get('/leavesreq', employeeController.getUserLeaveRequests);



// ================= Notifications =================
router.get('/my-notifications', employeeController.getMyNotifications);
router.put('/my-notifications/:id/read', employeeController.readNotification);


module.exports = router;
