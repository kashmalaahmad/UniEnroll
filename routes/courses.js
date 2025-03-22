const express = require('express');
const router = express.Router();
const Course = require('../models/Course');

// Get all courses with filters
router.get('/', async (req, res) => {
    try {
        const { department, level, day, availableSeats } = req.query;
        let query = {};

        if (department) query.department = department;
        if (level) query.level = parseInt(level);
        if (day) query['schedule.day'] = day;
        if (availableSeats === 'true') {
            query.$expr = { $lt: [{ $size: '$enrolledStudents' }, '$capacity'] };
        }

        const courses = await Course.find(query)
            .populate('prerequisites')
            .lean();

        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single course
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('prerequisites')
            .lean();

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 