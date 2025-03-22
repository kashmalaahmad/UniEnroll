const express = require('express');
const router = express.Router();
const { adminViewAuth } = require('../middleware/adminAuth');

// Admin routes
router.get('/login', (req, res) => {
    res.render('admin/login');
});

router.get('/dashboard', adminViewAuth, (req, res) => {
    res.render('admin/dashboard');
});

router.get('/courses', adminViewAuth, (req, res) => {
    res.render('admin/courses');
});

router.get('/students', adminViewAuth, (req, res) => {
    res.render('admin/students');
});

router.get('/schedule', adminViewAuth, (req, res) => {
    res.render('admin/schedule');
});

router.get('/reports', adminViewAuth, (req, res) => {
    res.render('admin/reports');
});

module.exports = router; 