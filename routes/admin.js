const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const Course = require('../models/Course');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken'); // Added for token generation
const Admin = require('../models/Admin');
const mongoose = require('mongoose');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(400).json({ message: 'Invalid UserName' });
        }
        
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Password' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: admin._id, role: 'admin', isAdmin: true },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );
        
        // Set token in cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        // Return success response with token and admin info
        res.json({
            success: true,
            message: 'Login successful',
            token: token, // Include token in response for client-side storage
            admin: {
                id: admin._id,
                username: admin.username,
                name: admin.name || username // Fallback to username if name not available
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Add profile endpoint
router.get('/profile', adminAuth, async (req, res) => {
    try {
        const adminId = req.admin;
        
        const admin = await Admin.findById(adminId).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
 
        res.json({
            ...admin.toObject(),
            name: admin.name || admin.username || 'Admin'
        });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ message: 'Error fetching admin profile' });
    }
});

// Add student search endpoint
router.get('/students/search', adminAuth, async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        
        // Create a regex for case-insensitive search
        const searchRegex = new RegExp(searchQuery, 'i');
        
        // Search in multiple fields
        const students = await Student.find({
            $or: [
                { rollNumber: searchRegex },
                { name: searchRegex },
                { email: searchRegex },
                { department: searchRegex }
            ]
        }).select('rollNumber name department email status');
        
        res.json({ students });
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ message: 'Error searching students' });
    }
});

// Add course search endpoint
router.get('/courses/search', adminAuth, async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        
        // Create a regex for case-insensitive search
        const searchRegex = new RegExp(searchQuery, 'i');
        
        // Search in multiple fields
        const courses = await Course.find({
            $or: [
                { code: searchRegex },
                { name: searchRegex },
                { department: searchRegex }
            ]
        }).select('code name department credits status');
        
        // Format courses to match the expected structure in your frontend
        const formattedCourses = courses.map(course => ({
            _id: course._id,
            courseCode: course.code,
            name: course.name,
            department: course.department,
            credits: course.credits,
            status: course.status || 'Active'
        }));
        
        res.json({ courses: formattedCourses });
    } catch (error) {
        console.error('Error searching courses:', error);
        res.status(500).json({ message: 'Error searching courses' });
    }
});
// Update the dashboard/stats endpoint to include all required fields
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const totalCourses = await Course.countDocuments();
        const totalStudents = await Student.countDocuments();
        
        // Count active registrations (this depends on your schema, adjust as needed)
        const activeRegistrations = await Course.aggregate([
            { $project: { registeredCount: { $size: "$registeredStudents" } } },
            { $group: { _id: null, total: { $sum: "$registeredCount" } } }
        ]);
        
        // Get unique departments from courses
        const departments = await Course.distinct('department');
        const totalDepartments = departments.length;
        
        res.json({
            totalCourses,
            totalStudents,
            activeRegistrations: activeRegistrations[0]?.total || 0,
            totalDepartments,
            // Include any other stats your frontend might need
            availableSeats: await calculateAvailableSeats(),
            pendingApprovals: await Student.countDocuments({ registrationOverride: false })
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Helper function to calculate available seats
async function calculateAvailableSeats() {
    try {
        const courses = await Course.find();
        return courses.reduce((acc, course) => 
            acc + (course.capacity - course.registeredStudents.length), 0);
    } catch (error) {
        console.error('Error calculating available seats:', error);
        return 0;
    }
}

router.get('/students/recent', adminAuth, async (req, res) => {
    try {
        const recentStudents = await Student.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('rollNumber name department year email');
        console.log(recentStudents);
        res.json({ students: recentStudents }); 
    } catch (error) {
        console.error('Error fetching recent students:', error);
        res.status(500).json({ message: 'Error fetching recent students' });
    }
});

router.get('/courses/recent', adminAuth, async (req, res) => {
    try {
        const recentCourses = await Course.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('code name department credits');
        console.log(recentCourses);
        res.json({ courses: recentCourses }); 
    } catch (error) {
        console.error('Error fetching recent courses:', error);
        res.status(500).json({ message: 'Error fetching recent courses' });
    }
});
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const totalCourses = await Course.countDocuments();
        const totalStudents = await Student.countDocuments();
        const courses = await Course.find();
        const availableSeats = courses.reduce((acc, course) => acc + (course.capacity - course.registeredStudents.length), 0);
        const pendingApprovals = await Student.countDocuments({ registrationOverride: false });
        
        res.json({
            totalCourses,
            totalStudents,
            availableSeats,
            pendingApprovals
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Course Management


// Get all courses
router.get('/courses', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
});

// Get one course by ID
router.get('/courses/:id', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ message: 'Error fetching course', error: error.message });
    }
});

// Create a new course
router.post('/courses', adminAuth, async (req, res) => {
    try {
        // Create the course with basic data first
        const courseData = {
            code: req.body.code,
            name: req.body.name,
            department: req.body.department,
            level: req.body.level,
            credits: req.body.credits,
            description: req.body.description,
            capacity: req.body.capacity,
            instructor: req.body.instructor || 'TBD',
            schedule: req.body.schedule || [],
            registeredStudents: []
        };
        
        const course = new Course(courseData);
        await course.save();
        
        // Add prerequisites if any
        if (req.body.prerequisites && req.body.prerequisites.length > 0) {
            course.prerequisites = req.body.prerequisites;
            await course.save();
        }
        
        // Return the new course with populated fields
        const populatedCourse = await Course.findById(course._id)
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
            
        res.status(201).json(populatedCourse);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Error creating course', error: error.message });
    }
});

// Update a course
router.put('/courses/:id', adminAuth, async (req, res) => {
    try {
        // Update the course with the new data
        const courseData = {
            code: req.body.code,
            name: req.body.name,
            department: req.body.department,
            level: req.body.level,
            credits: req.body.credits,
            description: req.body.description,
            capacity: req.body.capacity,
            instructor: req.body.instructor || 'TBD',
            schedule: req.body.schedule || [],
            prerequisites: req.body.prerequisites || []
        };
        
        const course = await Course.findByIdAndUpdate(
            req.params.id, 
            courseData, 
            { new: true }
        ).populate('prerequisites', 'code name')
         .populate('registeredStudents', 'name email');
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ message: 'Error updating course', error: error.message });
    }
});

// Delete a course
router.delete('/courses/:id', adminAuth, async (req, res) => {
    try {
        // First check if the course has registered students
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        if (course.registeredStudents && course.registeredStudents.length > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete a course with registered students. Please remove all students first.' 
            });
        }
        
        // Also check if this course is a prerequisite for any other courses
        const dependentCourses = await Course.find({ prerequisites: req.params.id });
        
        if (dependentCourses && dependentCourses.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete a course that is a prerequisite for other courses',
                dependentCourses: dependentCourses.map(c => ({ id: c._id, code: c.code, name: c.name }))
            });
        }
        
        // If all checks pass, delete the course
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// Add a student to a course
router.post('/courses/:id/register/:studentId', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if course is at capacity
        if (course.registeredStudents.length >= course.capacity) {
            return res.status(400).json({ message: 'Course is at capacity' });
        }
        
        // Check if student is already registered
        if (course.registeredStudents.includes(req.params.studentId)) {
            return res.status(400).json({ message: 'Student already registered for this course' });
        }
        
        // Add student to course
        course.registeredStudents.push(req.params.studentId);
        await course.save();
        
        const updatedCourse = await Course.findById(req.params.id)
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
            
        res.json(updatedCourse);
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ message: 'Error registering student', error: error.message });
    }
});

// Remove a student from a course
router.delete('/courses/:id/unregister/:studentId', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if student is registered for the course
        if (!course.registeredStudents.includes(req.params.studentId)) {
            return res.status(400).json({ message: 'Student not registered for this course' });
        }
        
        // Remove student from course
        course.registeredStudents = course.registeredStudents.filter(
            studentId => studentId.toString() !== req.params.studentId
        );
        await course.save();
        
        const updatedCourse = await Course.findById(req.params.id)
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
            
        res.json(updatedCourse);
    } catch (error) {
        console.error('Error unregistering student:', error);
        res.status(500).json({ message: 'Error unregistering student', error: error.message });
    }
});

// Search courses by various criteria
router.get('/courses/search', adminAuth, async (req, res) => {
    try {
        const query = {};
        
        if (req.query.code) query.code = new RegExp(req.query.code, 'i');
        if (req.query.name) query.name = new RegExp(req.query.name, 'i');
        if (req.query.department) query.department = new RegExp(req.query.department, 'i');
        if (req.query.level) query.level = parseInt(req.query.level);
        if (req.query.instructor) query.instructor = new RegExp(req.query.instructor, 'i');
        
        const courses = await Course.find(query)
            .populate('prerequisites', 'code name')
            .populate('registeredStudents', 'name email');
            
        res.json(courses);
    } catch (error) {
        console.error('Error searching courses:', error);
        res.status(500).json({ message: 'Error searching courses', error: error.message });
    }
});


router.get('/students', adminAuth, async (req, res) => {
  try {
    const students = await Student.find({})
      .select('name rollNumber department year registeredCourses')
      .populate('registeredCourses', 'code name');
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});


router.get('/students/:id', adminAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'registeredCourses',
        select: 'code name prerequisites',
        populate: {
          path: 'prerequisites',
          select: 'code completed'
        }
      });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Process the student data to include prerequisite status
    const processedStudent = {
        ...student.toObject(),
        registeredCourses: student.registeredCourses.map(course => {
          // Check if student has completed prerequisites
          const prerequisites = course.prerequisites.map(prereq => {
            // Add this check
            const completed = student.completedCourses ? student.completedCourses.some(
              completedCourse => completedCourse.toString() === prereq._id.toString()
            ) : false;
            
            return {
              code: prereq.code,
              completed
            };
          });

        
        return {
          _id: course._id,
          code: course.code,
          name: course.name,
          prerequisites
        };
      })
    };
    
    res.json(processedStudent);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Error fetching student details' });
  }
});

/**
 * Override registration - Add student to course even if prerequisites not met or course is full
 * Route: POST /students/:id/override
 */
router.post('/students/:id/override', adminAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    const student = await Student.findById(req.params.id).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const course = await Course.findById(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if student is already registered for this course
    if (student.registeredCourses.includes(courseId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Student is already registered for this course' });
    }
    
    // Add course to student's registered courses
    student.registeredCourses.push(courseId);
    await student.save({ session });
    
    // Increment course enrollment count
    course.currentEnrollment = (course.currentEnrollment || 0) + 1;
    await course.save({ session });
    
    // Log the action to console instead of database
    console.log(`Admin override: Student ${student._id} registered for course ${course._id} by admin ${req.user ? req.user._id : 'unknown'}`);
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({ success: true, message: 'Registration override successful' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error overriding registration:', error);
    res.status(500).json({ message: 'Error overriding registration' });
  }
});

/**
 * Remove student from course
 * Route: POST /students/:id/removeCourse
 */
// Replace your current removeCourse route handler with this:
router.post('/students/:studentId/removeCourse', adminAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { courseId } = req.body;
      
      // Find the student
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      // Remove the course from student's registered courses
      student.registeredCourses = student.registeredCourses.filter(
        course => course.toString() !== courseId
      );
      await student.save();
      
      // Remove student from course's registered students
      await Course.findByIdAndUpdate(courseId, {
        $pull: { registeredStudents: studentId }
      });
      
      res.status(200).json({ message: 'Course removed successfully' });
    } catch (error) {
      console.error('Error removing course:', error);
      res.status(500).json({ message: error.message });
    }
});

router.get('/courses/searchmodal', adminAuth, async (req, res) => {
    try {
      const searchTerm = req.query.q || '';
      console.log('Search term:', searchTerm);
      
      const courses = await Course.find({
        name: { $regex: searchTerm, $options: 'i' }  // Changed from title to name
      }).limit(10).select('name code _id');  // Also changed here
      
      console.log('Found courses:', courses.length);
      res.json({ success: true, courses });
    } catch (err) {
      console.error('Error in search-modal endpoint:', err);
      res.status(500).json({ success: false, error: err.message });
    }
}); // Add this closing bracket

// Seat Management
router.get('/seats', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find().select('code name capacity registeredStudents');
        const seatsData = courses.map(course => ({
            courseId: course._id,
            courseCode: course.code,
            courseName: course.name,
            capacity: course.capacity,
            registeredStudents: course.registeredStudents.length,
            availableSeats: course.capacity - course.registeredStudents.length
        }));
        res.json(seatsData);
    } catch (error) {
        console.error('Error fetching seats data:', error);
        res.status(500).json({ message: 'Error fetching seats data' });
    }
});

router.put('/seats/:courseId', adminAuth, async (req, res) => {
    try {
        const { capacity } = req.body;
        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (capacity < course.registeredStudents.length) {
            return res.status(400).json({ message: 'New capacity cannot be less than current registrations' });
        }

        course.capacity = capacity;
        await course.save();

        res.json(course);
    } catch (error) {
        console.error('Error updating course capacity:', error);
        res.status(500).json({ message: 'Error updating course capacity' });
    }
});

// Reports
router.get('/reports/courses', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('registeredStudents', 'rollNumber name')
            .lean();

        const report = courses.map(course => ({
            courseCode: course.code,
            courseName: course.name,
            totalStudents: course.registeredStudents.length,
            availableSeats: course.capacity - course.registeredStudents.length,
            students: course.registeredStudents.map(student => ({
                rollNumber: student.rollNumber,
                name: student.name
            }))
        }));

        res.json(report);
    } catch (error) {
        console.error('Error generating course report:', error);
        res.status(500).json({ message: 'Error generating course report' });
    }
});

router.get('/reports/prerequisites', adminAuth, async (req, res) => {
    try {
        const students = await Student.find()
            .populate('registeredCourses')
            .lean();

        const courses = await Course.find()
            .populate('prerequisites')
            .lean();

        const report = students.map(student => {
            const missingPrereqs = courses.filter(course => {
                if (!student.registeredCourses.some(rc => rc._id.toString() === course._id.toString())) {
                    return false;
                }
                return course.prerequisites.some(prereq => 
                    !student.registeredCourses.some(rc => rc._id.toString() === prereq._id.toString())
                );
            });

            return {
                studentId: student._id,
                rollNumber: student.rollNumber,
                name: student.name,
                coursesWithMissingPrereqs: missingPrereqs.map(course => ({
                    courseCode: course.code,
                    courseName: course.name,
                    missingPrerequisites: course.prerequisites
                        .filter(prereq => !student.registeredCourses.some(rc => rc._id.toString() === prereq._id.toString()))
                        .map(prereq => ({
                            code: prereq.code,
                            name: prereq.name
                        }))
                }))
            };
        }).filter(report => report.coursesWithMissingPrereqs.length > 0);

        res.json(report);
    } catch (error) {
        console.error('Error generating prerequisite report:', error);
        res.status(500).json({ message: 'Error generating prerequisite report' });
    }
});

router.get('/reports/seats', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find()
            .select('code name capacity registeredStudents')
            .lean();

        const report = courses.map(course => ({
            courseCode: course.code,
            courseName: course.name,
            totalCapacity: course.capacity,
            registeredStudents: course.registeredStudents.length,
            availableSeats: course.capacity - course.registeredStudents.length,
            utilizationRate: ((course.registeredStudents.length / course.capacity) * 100).toFixed(2) + '%'
        }));

        res.json(report);
    } catch (error) {
        console.error('Error generating seats report:', error);
        res.status(500).json({ message: 'Error generating seats report' });
    }
});

// Report endpoints
router.get('/reports/stats', adminAuth, async (req, res) => {
    try {
        // Get current semester's stats
        const currentStats = await Promise.all([
            Student.countDocuments(),
            Course.countDocuments(),
            Course.aggregate([
                { $group: { _id: null, avgEnrollment: { $avg: { $size: "$registeredStudents" } } } }
            ]),
            Course.aggregate([
                { $unwind: "$registeredStudents" },
                { $lookup: { from: "students", localField: "registeredStudents", foreignField: "_id", as: "student" } },
                { $unwind: "$student" },
                { $group: { _id: "$code", prerequisites: "$prerequisites", completedPrerequisites: "$student.completedCourses" } },
                { $project: { 
                    compliance: { 
                        $cond: { 
                            if: { $eq: [{ $size: "$prerequisites" }, 0] },
                            then: 1,
                            else: { 
                                $divide: [
                                    { $size: { $setIntersection: ["$prerequisites", "$completedPrerequisites"] } },
                                    { $size: "$prerequisites" }
                                ]
                            }
                        }
                    }
                } },
                { $group: { _id: null, avgCompliance: { $avg: "$compliance" } } }
            ])
        ]);

        // Get last semester's stats for trend calculation
        const lastSemesterStats = await Promise.all([
            Student.countDocuments({ semester: { $ne: "current" } }),
            Course.countDocuments({ semester: { $ne: "current" } }),
            Course.aggregate([
                { $match: { semester: { $ne: "current" } } },
                { $group: { _id: null, avgEnrollment: { $avg: { $size: "$registeredStudents" } } } }
            ]),
            Course.aggregate([
                { $match: { semester: { $ne: "current" } } },
                { $unwind: "$registeredStudents" },
                { $lookup: { from: "students", localField: "registeredStudents", foreignField: "_id", as: "student" } },
                { $unwind: "$student" },
                { $group: { _id: "$code", prerequisites: "$prerequisites", completedPrerequisites: "$student.completedCourses" } },
                { $project: { 
                    compliance: { 
                        $cond: { 
                            if: { $eq: [{ $size: "$prerequisites" }, 0] },
                            then: 1,
                            else: { 
                                $divide: [
                                    { $size: { $setIntersection: ["$prerequisites", "$completedPrerequisites"] } },
                                    { $size: "$prerequisites" }
                                ]
                            }
                        }
                    }
                } },
                { $group: { _id: null, avgCompliance: { $avg: "$compliance" } } }
            ])
        ]);

        // Calculate trends
        const calculateTrend = (current, last) => {
            if (!last || last === 0) return 0;
            return ((current - last) / last) * 100;
        };

        res.json({
            totalStudents: currentStats[0],
            totalCourses: currentStats[1],
            avgEnrollment: currentStats[2][0]?.avgEnrollment || 0,
            prerequisiteCompliance: (currentStats[3][0]?.avgCompliance || 0) * 100,
            studentTrend: calculateTrend(currentStats[0], lastSemesterStats[0]),
            courseTrend: calculateTrend(currentStats[1], lastSemesterStats[1]),
            enrollmentTrend: calculateTrend(currentStats[2][0]?.avgEnrollment || 0, lastSemesterStats[2][0]?.avgEnrollment || 0),
            complianceTrend: calculateTrend((currentStats[3][0]?.avgCompliance || 0) * 100, (lastSemesterStats[3][0]?.avgCompliance || 0) * 100)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

router.get('/reports/trends', adminAuth, async (req, res) => {
    try {
        const period = req.query.period || 'week';
        let startDate = new Date();
        
        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'semester':
                startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 4, 1);
                break;
        }

        const registrations = await Course.aggregate([
            { $unwind: "$registeredStudents" },
            { $match: { "registeredStudents.registrationDate": { $gte: startDate } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$registeredStudents.registrationDate" } },
                count: { $sum: 1 }
            } },
            { $sort: { "_id": 1 } }
        ]);

        res.json({
            labels: registrations.map(r => r._id),
            data: registrations.map(r => r.count)
        });
    } catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).json({ message: 'Error fetching registration trends' });
    }
});

router.get('/reports/prerequisites', adminAuth, async (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        let query = {};

        switch (filter) {
            case 'withPrerequisites':
                query = { prerequisites: { $exists: true, $ne: [] } };
                break;
            case 'withoutPrerequisites':
                query = { prerequisites: { $exists: false } };
                break;
        }

        const courses = await Course.find(query)
            .populate('registeredStudents', 'completedCourses')
            .lean();

        const analysis = courses.map(course => {
            const totalStudents = course.registeredStudents.length;
            const studentsWithPrerequisites = course.registeredStudents.filter(student => {
                if (!course.prerequisites || course.prerequisites.length === 0) return true;
                return course.prerequisites.every(prereq => 
                    student.completedCourses.includes(prereq)
                );
            }).length;

            return {
                code: course.code,
                name: course.name,
                department: course.department,
                prerequisites: course.prerequisites || [],
                complianceRate: totalStudents > 0 ? (studentsWithPrerequisites / totalStudents) * 100 : 0,
                completedPrerequisites: course.prerequisites.filter(prereq => 
                    course.registeredStudents.some(student => 
                        student.completedCourses.includes(prereq)
                    )
                )
            };
        });

        res.json(analysis);
    } catch (error) {
        console.error('Error fetching prerequisites:', error);
        res.status(500).json({ message: 'Error fetching prerequisite analysis' });
    }
});

router.get('/reports/capacity', adminAuth, async (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        let query = {};

        const courses = await Course.find(query).lean();
        const analysis = courses.map(course => {
            const enrolled = course.registeredStudents.length;
            const utilization = (enrolled / course.capacity) * 100;
            let status = 'Empty';

            if (utilization >= 90) status = 'Full';
            else if (utilization > 0) status = 'Partial';

            return {
                code: course.code,
                name: course.name,
                department: course.department,
                capacity: course.capacity,
                enrolled: enrolled,
                utilization: utilization,
                status: status
            };
        });

        // Apply filter if specified
        if (filter !== 'all') {
            const filteredAnalysis = analysis.filter(course => course.status === filter);
            res.json(filteredAnalysis);
        } else {
            res.json(analysis);
        }
    } catch (error) {
        console.error('Error fetching capacity:', error);
        res.status(500).json({ message: 'Error fetching capacity analysis' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;