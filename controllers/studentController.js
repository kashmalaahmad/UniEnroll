const Student = require('../models/Student');
const Course = require('../models/Course');

// Get student profile
exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber })
            .populate('registeredCourses')
            .populate('potentialSchedule');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get student's current schedule
exports.getCurrentSchedule = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber })
            .populate('registeredCourses');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student.registeredCourses);
    } catch (error) {
        console.error('Get current schedule error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get student's potential schedule
exports.getPotentialSchedule = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber })
            .populate('potentialSchedule');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student.potentialSchedule);
    } catch (error) {
        console.error('Get potential schedule error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add course to potential schedule
exports.addToPotentialSchedule = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber });
        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if course is already in potential schedule
        if (student.potentialSchedule.includes(course._id)) {
            return res.status(400).json({ message: 'Course already in potential schedule' });
        }

        // Add to potential schedule
        student.potentialSchedule.push(course._id);
        await student.save();

        // Emit real-time update
        req.app.get('io').to(student.rollNumber).emit('scheduleUpdate', {
            type: 'add',
            course: course
        });

        res.json({ message: 'Course added to potential schedule' });
    } catch (error) {
        console.error('Add to potential schedule error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove course from potential schedule
exports.removeFromPotentialSchedule = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber });
        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Remove from potential schedule
        student.potentialSchedule = student.potentialSchedule.filter(
            courseId => courseId.toString() !== course._id.toString()
        );
        await student.save();

        // Emit real-time update
        req.app.get('io').to(student.rollNumber).emit('scheduleUpdate', {
            type: 'remove',
            courseId: course._id
        });

        res.json({ message: 'Course removed from potential schedule' });
    } catch (error) {
        console.error('Remove from potential schedule error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Check for schedule conflicts
exports.checkConflicts = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber })
            .populate('potentialSchedule');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const conflicts = [];
        const schedule = student.potentialSchedule;

        // Check for time conflicts
        for (let i = 0; i < schedule.length; i++) {
            for (let j = i + 1; j < schedule.length; j++) {
                const course1 = schedule[i];
                const course2 = schedule[j];

                for (const time1 of course1.schedule) {
                    for (const time2 of course2.schedule) {
                        if (time1.day === time2.day) {
                            const start1 = new Date(`1970-01-01T${time1.startTime}`);
                            const end1 = new Date(`1970-01-01T${time1.endTime}`);
                            const start2 = new Date(`1970-01-01T${time2.startTime}`);
                            const end2 = new Date(`1970-01-01T${time2.endTime}`);

                            if (
                                (start1 <= start2 && end1 > start2) ||
                                (start2 <= start1 && end2 > start1)
                            ) {
                                conflicts.push({
                                    type: 'time',
                                    course1: course1.code,
                                    course2: course2.code,
                                    day: time1.day,
                                    time: `${time1.startTime}-${time1.endTime}`
                                });
                            }
                        }
                    }
                }
            }
        }

        // Check for prerequisite conflicts
        for (const course of schedule) {
            const prerequisites = await Course.find({
                _id: { $in: course.prerequisites }
            });

            for (const prereq of prerequisites) {
                if (!schedule.some(c => c._id.toString() === prereq._id.toString())) {
                    conflicts.push({
                        type: 'prerequisite',
                        course: course.code,
                        missingPrerequisite: prereq.code
                    });
                }
            }
        }

        res.json({ conflicts });
    } catch (error) {
        console.error('Check conflicts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Finalize schedule (register for courses)
exports.finalizeSchedule = async (req, res) => {
    try {
        const student = await Student.findOne({ rollNumber: req.user.rollNumber })
            .populate('potentialSchedule');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check for conflicts first
        const conflicts = await checkConflicts(student.potentialSchedule);
        if (conflicts.length > 0) {
            return res.status(400).json({
                message: 'Cannot finalize schedule due to conflicts',
                conflicts
            });
        }

        // Check seat availability
        for (const course of student.potentialSchedule) {
            if (course.enrolledStudents.length >= course.capacity) {
                return res.status(400).json({
                    message: `Course ${course.code} is full`
                });
            }
        }

        // Register for courses
        for (const course of student.potentialSchedule) {
            course.enrolledStudents.push(student._id);
            await course.save();
        }

        // Update student's registered courses
        student.registeredCourses = student.potentialSchedule;
        student.potentialSchedule = [];
        await student.save();

        // Emit real-time update
        req.app.get('io').to(student.rollNumber).emit('scheduleFinalized', {
            courses: student.registeredCourses
        });

        res.json({ message: 'Schedule finalized successfully' });
    } catch (error) {
        console.error('Finalize schedule error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to check conflicts
async function checkConflicts(schedule) {
    const conflicts = [];

    // Check for time conflicts
    for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
            const course1 = schedule[i];
            const course2 = schedule[j];

            for (const time1 of course1.schedule) {
                for (const time2 of course2.schedule) {
                    if (time1.day === time2.day) {
                        const start1 = new Date(`1970-01-01T${time1.startTime}`);
                        const end1 = new Date(`1970-01-01T${time1.endTime}`);
                        const start2 = new Date(`1970-01-01T${time2.startTime}`);
                        const end2 = new Date(`1970-01-01T${time2.endTime}`);

                        if (
                            (start1 <= start2 && end1 > start2) ||
                            (start2 <= start1 && end2 > start1)
                        ) {
                            conflicts.push({
                                type: 'time',
                                course1: course1.code,
                                course2: course2.code,
                                day: time1.day,
                                time: `${time1.startTime}-${time1.endTime}`
                            });
                        }
                    }
                }
            }
        }
    }

    // Check for prerequisite conflicts
    for (const course of schedule) {
        const prerequisites = await Course.find({
            _id: { $in: course.prerequisites }
        });

        for (const prereq of prerequisites) {
            if (!schedule.some(c => c._id.toString() === prereq._id.toString())) {
                conflicts.push({
                    type: 'prerequisite',
                    course: course.code,
                    missingPrerequisite: prereq.code
                });
            }
        }
    }

    return conflicts;
} 