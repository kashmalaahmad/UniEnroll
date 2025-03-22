const Course = require('../models/Course');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

const adminController = {
    // Dashboard
    getDashboardStats: async (req, res) => {
        try {
            const [totalCourses, totalStudents] = await Promise.all([
                Course.countDocuments(),
                Student.countDocuments()
            ]);

            res.json({
                totalCourses,
                totalStudents
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Course Management
    getAllCourses: async (req, res) => {
        try {
            const courses = await Course.find().populate('prerequisites').lean();
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    createCourse: async (req, res) => {
        try {
            const course = new Course(req.body);
            await course.save();
            res.status(201).json(course);
        } catch (error) {
            console.error('Create course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateCourse: async (req, res) => {
        try {
            const course = await Course.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json(course);
        } catch (error) {
            console.error('Update course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deleteCourse: async (req, res) => {
        try {
            const course = await Course.findByIdAndDelete(req.params.id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json({ message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Delete course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Student Management
    getAllStudents: async (req, res) => {
        try {
            const students = await Student.find()
                .populate('registeredCourses')
                .populate('potentialSchedule');
            res.json(students);
        } catch (error) {
            console.error('Get all students error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudent: async (req, res) => {
        try {
            const student = await Student.findOne({ rollNumber: req.params.rollNumber })
                .populate('registeredCourses')
                .lean();
            
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            
            res.json(student);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateStudent: async (req, res) => {
        try {
            const student = await Student.findOneAndUpdate(
                { rollNumber: req.params.rollNumber },
                req.body,
                { new: true }
            ).populate('registeredCourses');

            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json(student);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Schedule Management
    getAllSchedules: async (req, res) => {
        try {
            const students = await Student.find()
                .populate('registeredCourses')
                .lean();
            
            const schedules = students.map(student => ({
                student: {
                    rollNumber: student.rollNumber,
                    name: student.name
                },
                courses: student.registeredCourses
            }));

            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudentSchedule: async (req, res) => {
        try {
            const student = await Student.findOne({ rollNumber: req.params.rollNumber })
                .populate('registeredCourses')
                .lean();
            
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json(student.registeredCourses);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = adminController; 