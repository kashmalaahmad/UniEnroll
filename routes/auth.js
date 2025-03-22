const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// Student login
router.post('/student/login', async (req, res) => {
    try {
        const { rollNumber } = req.body;
        const student = await Student.findOne({ rollNumber });

        if (!student) {
            return res.status(401).json({ message: 'Invalid roll number' });
        }

        const token = jwt.sign(
            { id: student._id, rollNumber: student.rollNumber },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            student: {
                id: student._id,
                rollNumber: student.rollNumber,
                name: student.name
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username !== process.env.ADMIN_USERNAME || 
            password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            admin: { username }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 