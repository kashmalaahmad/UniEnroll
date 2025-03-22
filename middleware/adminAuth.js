const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
    try {
        // Check for token in cookie first
        const cookieToken = req.cookies.adminToken;
        
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
            
            // Get admin from database
            const admin = await Admin.findById(decoded.id).select('-password');
            
            if (!admin) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            // Add admin to request object
            req.admin = admin;
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
const adminViewAuth = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken;

        if (!token) {
            return res.redirect('/admin/login');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const admin = await Admin.findById(decoded.id).select('-password');
            
            if (!admin) {
                res.clearCookie('adminToken');
                return res.redirect('/admin/login');
            }

            req.admin = admin;
            next();
        } catch (err) {
            res.clearCookie('adminToken');
            return res.redirect('/admin/login');
        }
    } catch (err) {
        console.error('View auth error:', err);
        res.clearCookie('adminToken');
        return res.redirect('/admin/login');
    }
};

module.exports = { adminAuth, adminViewAuth }; 