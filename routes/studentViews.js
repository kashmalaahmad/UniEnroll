const express = require('express');
const router = express.Router();
const path = require('path');
const { studentViewAuth } = require('../middleware/studentAuth');

// Student login page
router.get('/login', (req, res) => {
    res.render('student/login');
});

// Student dashboard
router.get('/dashboard', studentViewAuth, (req, res) => {
    res.render('student/dashboard', { student: req.student });
});

// Student courses page
router.get('/courses', studentViewAuth, (req, res) => {
    res.render('student/courses', { student: req.student });
});

// Student schedule page
router.get('/schedule', studentViewAuth, (req, res) => {
    res.render('student/schedule', { student: req.student });
});

// Student prerequisites page
router.get('/prerequisites', studentViewAuth, (req, res) => {
    res.render('student/prerequisites', { student: req.student });
});

module.exports = router;