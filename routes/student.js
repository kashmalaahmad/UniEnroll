const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Student = require('../models/Student');
const { studentAuth } = require('../middleware/studentAuth');
const jwt = require('jsonwebtoken');

// Student login route (no auth required)
router.post('/login', async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        
        // Find student by roll number
        const student = await Student.findOne({ rollNumber });
        
        if (!student) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Verify password if you have password authentication
        if (password) {
            const isMatch = await student.comparePassword(password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: student._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );
        
        // Set token in cookie
        res.cookie('studentToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        // Return success response
        res.json({
            success: true,
            message: 'Login successful',
            token: token, // Add token in response for testing
            student: {
                id: student._id,
                name: student.name,
                rollNumber: student.rollNumber
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Add this to your routes/student.js file

// Logout route
router.post('/logout', async (req, res) => {
    try {
      // Clear the authentication cookie/session
      if (req.session) {
        // If using express-session
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Error logging out' });
          }
          
          // If using a specific cookie for authentication, also clear it
          res.clearCookie('student_auth'); // Replace with your actual cookie name
          
          return res.status(200).json({ success: true, message: 'Logged out successfully' });
        });
      } else {
        // If not using express-session but only cookies
        res.clearCookie('student_auth'); // Replace with your actual cookie name
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ success: false, message: 'Server error during logout' });
    }
  });

router.get('/profile', studentAuth, async (req, res) => {
    try {
        console.log('Profile route hit - auth passed');
        console.log('Student in request:', req.student?._id);
        
        // Ensure we're sending all the necessary profile fields
        const student = await Student.findById(req.student._id)
            .select('name email department year rollNumber')
            .lean();
            
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.json({
            success: true,
            message: 'Profile retrieved',
            profile: {
                id: student._id,
                name: student.name,
                email: student.email,
                department: student.department,
                year: student.year,
                rollNumber: student.rollNumber
            }
        });
    } catch (error) {
        console.error('Profile route error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all courses with detailed information
router.get('/courses', studentAuth, async (req, res) => {
    try {
        // Get the student's registered courses and information
        const student = await Student.findById(req.student._id)
            .select('registeredCourses department year')
            .lean();
            
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Get all available courses with detailed information
        const courses = await Course.find()
            .select('_id code name credits department level capacity registeredStudents instructor schedule description')
            .lean();
            
        // Format for client with more detailed information
        const formattedCourses = courses.map(course => {
            // Convert schedule array to expected format for frontend
            const schedule = course.schedule ? course.schedule.map(slot => ({
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                location: slot.room
            })) : [];
            
            // Check if student is already registered
            const isRegistered = student.registeredCourses && 
                student.registeredCourses.some(id => id.toString() === course._id.toString());
                
            // Calculate available seats
            const availableSeats = course.capacity - (course.registeredStudents?.length || 0);
            
            return {
                id: course._id,
                code: course.code,
                name: course.name,
                credits: course.credits,
                department: course.department,
                level: course.level.toString(), // Convert to string for filter dropdown
                instructor: course.instructor,
                description: course.description,
                schedule: schedule,
                location: schedule.length > 0 ? schedule[0].location : 'TBD',
                availableSeats: availableSeats,
                totalSeats: course.capacity,
                isRegistered: isRegistered
            };
        });
        
        res.json({ 
            success: true,
            courses: formattedCourses 
        });
    } catch (error) {
        console.error('Error getting available courses:', error);
        res.status(500).json({ message: 'Error getting available courses' });
    }
});

// Get registered courses for the logged-in student
router.get('/courses/registered', studentAuth, async (req, res) => {
    try {
        // Get student with enrolled courses - using req.student from auth middleware
        const student = await Student.findById(req.student._id)
            .populate('registeredCourses', '_id code name credits schedule')
            .lean();
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Format for client
        const registeredCourses = student.registeredCourses ? student.registeredCourses.map(course => {
            // Format schedule if it exists
            const schedule = course.schedule ? course.schedule.map(slot => ({
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                location: slot.room
            })) : [];
            
            return {
                id: course._id,
                code: course.code,
                name: course.name,
                credits: course.credits,
                schedule: schedule
            };
        }) : [];
        
        res.json({ courses: registeredCourses });
    } catch (error) {
        console.error('Error getting registered courses:', error);
        res.status(500).json({ message: 'Error getting registered courses' });
    }
});

// Register for a course
router.post('/courses/register', studentAuth, async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.student._id;
        
        if (!courseId) {
            return res.status(400).json({ message: 'Course ID is required' });
        }
        
        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if student already registered
        const student = await Student.findById(studentId).populate('registeredCourses');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Check if already enrolled
        if (student.registeredCourses.some(c => c._id.toString() === courseId)) {
            return res.status(400).json({ message: 'Already registered for this course' });
        }
        
        // Check if seats available
        if (course.registeredStudents && course.registeredStudents.length >= course.capacity) {
            return res.status(400).json({ message: 'No seats available in this course' });
        }
        
        // Check prerequisites
        if (course.prerequisites && course.prerequisites.length > 0) {
            const hasAllPrereqs = course.prerequisites.every(prereqId => 
                student.registeredCourses.some(c => c._id.toString() === prereqId.toString())
            );
            
            if (!hasAllPrereqs) {
                return res.status(400).json({ message: 'Prerequisites not met for this course' });
            }
        }
        
        // Check schedule conflicts
        const targetCourseSchedule = course.schedule || [];
        const studentSchedule = [];
        
        // Collect all schedule slots from registered courses
        if (student.registeredCourses) {
            student.registeredCourses.forEach(regCourse => {
                if (regCourse.schedule) {
                    studentSchedule.push(...regCourse.schedule);
                }
            });
        }
        
        // Check for conflicts
        const hasConflict = targetCourseSchedule.some(targetSlot => {
            return studentSchedule.some(existingSlot => {
                // If different days, no conflict
                if (targetSlot.day !== existingSlot.day) return false;
                
                // Parse times for comparison (simple string comparison isn't reliable for time)
                const targetStart = parseTimeString(targetSlot.startTime);
                const targetEnd = parseTimeString(targetSlot.endTime);
                const existingStart = parseTimeString(existingSlot.startTime);
                const existingEnd = parseTimeString(existingSlot.endTime);
                
                // Check if time periods overlap
                return (targetStart < existingEnd && targetEnd > existingStart);
            });
        });
        
        if (hasConflict) {
            return res.status(400).json({ message: 'Schedule conflict with existing courses' });
        }
        
        // Register student
        await Student.findByIdAndUpdate(studentId, {
            $addToSet: { registeredCourses: courseId }
        });
        
        // Add student to course
        await Course.findByIdAndUpdate(courseId, {
            $addToSet: { registeredStudents: studentId }
        });
        
        res.status(200).json({ 
            success: true,
            message: 'Registered successfully' 
        });
    } catch (error) {
        console.error('Error registering for course:', error);
        res.status(500).json({ message: 'Error registering for course' });
    }
});

// Helper function to parse time strings like "9:00 AM" into minutes for comparison
function parseTimeString(timeStr) {
    // Split the time string into components
    const [timePart, period] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    // Return total minutes since midnight
    return hours * 60 + minutes;
}

// Drop a course
router.post('/courses/drop/:courseId', studentAuth, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.student._id;
        
        // Remove course from student
        await Student.findByIdAndUpdate(studentId, {
            $pull: { registeredCourses: courseId }
        });
        
        // Remove student from course
        await Course.findByIdAndUpdate(courseId, {
            $pull: { registeredStudents: studentId }
        });
        
        res.status(200).json({ message: 'Course dropped successfully' });
    } catch (error) {
        console.error('Error dropping course:', error);
        res.status(500).json({ message: 'Error dropping course' });
    }
});

// Get student schedule
router.get('/schedule', studentAuth, async (req, res) => {
    try {
        // Get student with enrolled courses
        const student = await Student.findById(req.student._id)
            .populate({
                path: 'registeredCourses',
                select: 'code name schedule'
            })
            .lean();
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Format schedule data for the calendar
        const scheduleData = [];
        
        student.registeredCourses.forEach(course => {
            if (course.schedule && course.schedule.length > 0) {
                course.schedule.forEach(slot => {
                    scheduleData.push({
                        courseCode: course.code,
                        courseName: course.name,
                        day: slot.day,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        location: slot.room || 'TBD'
                    });
                });
            }
        });
        
        res.json(scheduleData);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Error fetching schedule' });
    }
});

module.exports = router;