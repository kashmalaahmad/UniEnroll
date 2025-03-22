const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const studentAuth = async (req, res, next) => {
    try {
        // Check for token in cookie first
        const cookieToken = req.cookies.studentToken;
        
        // Then check Authorization header
        const authHeader = req.headers.authorization;
        const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        
        // Use cookie token if available, otherwise use header token
        const token = cookieToken || headerToken;

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get student from database
            const student = await Student.findById(decoded.id).select('-password');
            
            if (!student) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            // Add student to request object
            req.student = student;
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Middleware for view routes that checks for token in cookie only
const studentViewAuth = async (req, res, next) => {
    try {
        const token = req.cookies.studentToken;

        if (!token) {
            return res.redirect('/student/login');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const student = await Student.findById(decoded.id).select('-password');
            
            if (!student) {
                res.clearCookie('studentToken');
                return res.redirect('/student/login');
            }

            req.student = student;
            next();
        } catch (err) {
            res.clearCookie('studentToken');
            return res.redirect('/student/login');
        }
    } catch (err) {
        console.error('View auth error:', err);
        res.clearCookie('studentToken');
        return res.redirect('/student/login');
    }
};

module.exports = { studentAuth, studentViewAuth }; 