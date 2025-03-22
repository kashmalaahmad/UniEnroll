const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminViewAuth = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken;
        
        if (!token) {
            console.log('No token found in cookies');
            return res.redirect('/admin/login');
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const admin = await Admin.findById(decoded.id).select('-password');
            
            if (!admin) {
                console.log('Admin not found in database');
                res.clearCookie('adminToken');
                return res.redirect('/admin/login');
            }
            
            req.admin = admin;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            res.clearCookie('adminToken');
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.clearCookie('adminToken');
        res.redirect('/admin/login');
    }
};

module.exports = adminViewAuth;