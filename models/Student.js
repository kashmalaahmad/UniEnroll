const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    registeredCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    potentialSchedule: [{
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
studentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Method to check if student can register for a course
studentSchema.methods.canRegisterForCourse = async function(courseId) {
    const course = await mongoose.model('Course').findById(courseId);
    if (!course) return false;

    // Check if already registered
    if (this.registeredCourses.includes(courseId)) return false;

    // Check if course is full
    if (course.registeredStudents.length >= course.capacity) return false;

    // Check prerequisites
    return await course.hasPrerequisites(this._id);
};

// Method to get student's schedule
studentSchema.methods.getSchedule = async function() {
    const courses = await mongoose.model('Course')
        .find({ _id: { $in: this.registeredCourses } })
        .select('code name schedule');
    
    return courses.map(course => ({
        courseCode: course.code,
        courseName: course.name,
        schedule: course.schedule
    }));
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 