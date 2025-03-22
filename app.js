const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Add a simple test route directly in app.js
app.get('/app-test', (req, res) => {
    res.json({ message: 'App test route working' });
});

// Routes
const viewRoutes = require('./routes/views');
const adminRoutes = require('./routes/admin');
const studentApiRoutes = require('./routes/student');
const studentViewRoutes = require('./routes/studentViews');

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentApiRoutes);
// Add this to your server.js after all routes are registered
// View routes
app.use('/admin', viewRoutes);
app.use('/student', studentViewRoutes);

// Root route redirects to student login
app.get('/', (req, res) => {
    res.redirect('/student/login');
});

// 404 handler - must be BEFORE the error handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware - must be LAST
app.use((err, req, res, next) => {
    console.error('======= ERROR DETAILS =======');
    console.error('Error message:', err.message);
    console.error('Error name:', err.name);
    console.error('Full error:', err);
    console.error('Stack trace:', err.stack);
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);
    console.error('Request query:', req.query);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    console.error('======= END ERROR DETAILS =======');
    
    res.status(500).json({ message: 'Server error occurred', error: err.message });
});

module.exports = app;