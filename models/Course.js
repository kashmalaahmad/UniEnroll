const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    credits: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    instructor: {
        type: String,
        default: 'TBD'
    },
    prerequisites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    registeredStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    schedule: [{
        day: {
            type: String,
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        room: {
            type: String,
            required: true
        }
    }]
});

// Virtual for available seats
CourseSchema.virtual('availableSeats').get(function() {
    return this.capacity - (this.registeredStudents ? this.registeredStudents.length : 0);
});

// Make sure virtuals are included when converting to JSON
CourseSchema.set('toJSON', { virtuals: true });
CourseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Course', CourseSchema);