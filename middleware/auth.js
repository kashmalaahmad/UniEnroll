const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token, authorization denied' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Find student
        const student = await Student.findById(decoded.id).select('-password');
        
        if (!student) {
            return res.status(401).json({ message: 'Token is not valid' });
        }
        
        // Add student to request
        req.student = student;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};