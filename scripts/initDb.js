require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

const initializeDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            Admin.deleteMany({}),
            Course.deleteMany({}),
            Student.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // Create admins
        const admins = await Admin.create([
            {
                username: 'superadmin',
                email: 'superadmin@university.edu',
                password: 'Admin@123',
                role: 'superadmin',
                permissions: ['manage_courses', 'manage_students', 'manage_admins', 'view_reports']
            },
            {
                username: 'courseadmin',
                email: 'courseadmin@university.edu',
                password: 'Course@123',
                role: 'admin',
                permissions: ['manage_courses', 'view_reports']
            },
            {
                username: 'studentadmin',
                email: 'studentadmin@university.edu',
                password: 'Student@123',
                role: 'admin',
                permissions: ['manage_students', 'view_reports']
            },
            {
                username: 'reportadmin',
                email: 'reportadmin@university.edu',
                password: 'Report@123',
                role: 'admin',
                permissions: ['view_reports']
            }
        ]);
        console.log('Created admins:', admins.map(a => a.username).join(', '));

        // Create courses (first level courses without prerequisites)
        const firstLevelCourses = await Course.create([
            {
                code: 'CS101',
                name: 'Introduction to Computer Science',
                department: 'Computer Science',
                level: 1,
                credits: 3,
                description: 'Foundational concepts of computer science, basic programming, and problem-solving techniques.',
                capacity: 60,
                instructor: 'Dr. Alan Turing',
                prerequisites: [],
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '09:00',
                        endTime: '10:30',
                        room: 'Hall A101'
                    },
                    {
                        day: 'Wednesday',
                        startTime: '09:00',
                        endTime: '10:30',
                        room: 'Hall A101'
                    }
                ]
            },
            {
                code: 'MATH101',
                name: 'Calculus I',
                department: 'Mathematics',
                level: 1,
                credits: 4,
                description: 'Introduction to differential and integral calculus of functions of one variable.',
                capacity: 70,
                instructor: 'Dr. Katherine Johnson',
                prerequisites: [],
                schedule: [
                    {
                        day: 'Tuesday',
                        startTime: '10:00',
                        endTime: '12:00',
                        room: 'Hall B201'
                    },
                    {
                        day: 'Thursday',
                        startTime: '10:00',
                        endTime: '12:00',
                        room: 'Hall B201'
                    }
                ]
            },
            {
                code: 'PHYS101',
                name: 'Physics I',
                department: 'Physics',
                level: 1,
                credits: 4,
                description: 'Classical mechanics, Newton\'s laws, energy and momentum conservation.',
                capacity: 50,
                instructor: 'Dr. Richard Feynman',
                prerequisites: [],
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '14:00',
                        endTime: '16:00',
                        room: 'Hall C301'
                    },
                    {
                        day: 'Friday',
                        startTime: '10:00',
                        endTime: '12:00',
                        room: 'Lab P101'
                    }
                ]
            },
            {
                code: 'ENG101',
                name: 'English Composition',
                department: 'English',
                level: 1,
                credits: 3,
                description: 'Development of writing skills, critical reading, and rhetorical analysis.',
                capacity: 40,
                instructor: 'Prof. Jane Austen',
                prerequisites: [],
                schedule: [
                    {
                        day: 'Tuesday',
                        startTime: '14:00',
                        endTime: '15:30',
                        room: 'Room D401'
                    },
                    {
                        day: 'Thursday',
                        startTime: '14:00',
                        endTime: '15:30',
                        room: 'Room D401'
                    }
                ]
            }
        ]);
        console.log('Created first level courses');

        // Create second level courses with prerequisites
        const secondLevelCourses = await Course.create([
            {
                code: 'CS201',
                name: 'Data Structures and Algorithms',
                department: 'Computer Science',
                level: 2,
                credits: 4,
                description: 'Study of fundamental data structures, algorithms, and their analysis.',
                capacity: 45,
                instructor: 'Dr. Ada Lovelace',
                prerequisites: [firstLevelCourses[0]._id], // CS101
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '11:00',
                        endTime: '13:00',
                        room: 'Hall A102'
                    },
                    {
                        day: 'Wednesday',
                        startTime: '11:00',
                        endTime: '13:00',
                        room: 'Hall A102'
                    }
                ]
            },
            {
                code: 'CS202',
                name: 'Database Systems',
                department: 'Computer Science',
                level: 2,
                credits: 3,
                description: 'Introduction to database design, SQL, and data management systems.',
                capacity: 40,
                instructor: 'Dr. Edgar Codd',
                prerequisites: [firstLevelCourses[0]._id], // CS101
                schedule: [
                    {
                        day: 'Tuesday',
                        startTime: '09:00',
                        endTime: '10:30',
                        room: 'Hall A103'
                    },
                    {
                        day: 'Thursday',
                        startTime: '09:00',
                        endTime: '10:30',
                        room: 'Lab A203'
                    }
                ]
            },
            {
                code: 'MATH201',
                name: 'Calculus II',
                department: 'Mathematics',
                level: 2,
                credits: 4,
                description: 'Advanced topics in integral calculus, infinite series, and differential equations.',
                capacity: 60,
                instructor: 'Dr. Maryam Mirzakhani',
                prerequisites: [firstLevelCourses[1]._id], // MATH101
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '14:00',
                        endTime: '16:00',
                        room: 'Hall B202'
                    },
                    {
                        day: 'Wednesday',
                        startTime: '14:00',
                        endTime: '16:00',
                        room: 'Hall B202'
                    }
                ]
            },
            {
                code: 'PHYS201',
                name: 'Physics II',
                department: 'Physics',
                level: 2,
                credits: 4,
                description: 'Electricity, magnetism, and electromagnetic waves.',
                capacity: 45,
                instructor: 'Dr. Marie Curie',
                prerequisites: [firstLevelCourses[2]._id], // PHYS101
                schedule: [
                    {
                        day: 'Tuesday',
                        startTime: '14:00',
                        endTime: '16:00',
                        room: 'Hall C302'
                    },
                    {
                        day: 'Friday',
                        startTime: '14:00',
                        endTime: '16:00',
                        room: 'Lab P102'
                    }
                ]
            }
        ]);
        console.log('Created second level courses');

        // Create level 3 courses (without circular references)
        const thirdLevelCourses = await Course.create([
            {
                code: 'CS301',
                name: 'Software Engineering',
                department: 'Computer Science',
                level: 3,
                credits: 4,
                description: 'Principles of software development, project management, and design patterns.',
                capacity: 35,
                instructor: 'Dr. Margaret Hamilton',
                prerequisites: [secondLevelCourses[0]._id, secondLevelCourses[1]._id], // CS201, CS202
                schedule: [
                    {
                        day: 'Tuesday',
                        startTime: '11:00',
                        endTime: '13:00',
                        room: 'Hall A104'
                    },
                    {
                        day: 'Thursday',
                        startTime: '11:00',
                        endTime: '13:00',
                        room: 'Hall A104'
                    }
                ]
            },
            {
                code: 'CS302',
                name: 'Artificial Intelligence',
                department: 'Computer Science',
                level: 3,
                credits: 3,
                description: 'Introduction to AI concepts, search algorithms, knowledge representation, and machine learning.',
                capacity: 30,
                instructor: 'Dr. John McCarthy',
                prerequisites: [secondLevelCourses[0]._id, secondLevelCourses[2]._id], // CS201, MATH201
                schedule: [
                    {
                        day: 'Wednesday',
                        startTime: '16:00',
                        endTime: '17:30',
                        room: 'Hall A205'
                    },
                    {
                        day: 'Friday',
                        startTime: '16:00',
                        endTime: '17:30',
                        room: 'Lab A205'
                    }
                ]
            }
        ]);
        console.log('Created third level courses');

        // Create level 4 course with prerequisites to level 3 courses
        const fourthLevelCourses = await Course.create([
            {
                code: 'CS401',
                name: 'Advanced Topics in Computer Science',
                department: 'Computer Science',
                level: 4,
                credits: 4,
                description: 'Contemporary issues and advanced topics in computer science research and industry.',
                capacity: 25,
                instructor: 'Dr. Grace Hopper',
                prerequisites: [thirdLevelCourses[0]._id], // CS301
                schedule: [
                    {
                        day: 'Monday',
                        startTime: '16:00',
                        endTime: '18:00',
                        room: 'Hall A206'
                    },
                    {
                        day: 'Thursday',
                        startTime: '16:00',
                        endTime: '18:00',
                        room: 'Lab A206'
                    }
                ]
            }
        ]);
        console.log('Created fourth level courses');

        // Combine all courses for reference
        const allCourses = [
            ...firstLevelCourses, 
            ...secondLevelCourses, 
            ...thirdLevelCourses,
            ...fourthLevelCourses
        ];

        // Create students
        const students = await Student.create([
            {
                rollNumber: '2023001',
                name: 'John Doe',
                email: 'john.doe@university.edu',
                password: 'Student@123',
                department: 'Computer Science',
                year: 1,
                registeredCourses: [firstLevelCourses[0]._id, firstLevelCourses[1]._id] // CS101, MATH101
            },
            {
                rollNumber: '2023002',
                name: 'Jane Smith',
                email: 'jane.smith@university.edu',
                password: 'Student@123',
                department: 'Computer Science',
                year: 1,
                registeredCourses: [firstLevelCourses[0]._id, firstLevelCourses[1]._id, firstLevelCourses[2]._id] // CS101, MATH101, PHYS101
            },
            {
                rollNumber: '2022001',
                name: 'Robert Johnson',
                email: 'robert.johnson@university.edu',
                password: 'Student@123',
                department: 'Computer Science',
                year: 2,
                registeredCourses: [
                    firstLevelCourses[0]._id, firstLevelCourses[1]._id, // CS101, MATH101
                    secondLevelCourses[0]._id, secondLevelCourses[1]._id // CS201, CS202
                ]
            },
            {
                rollNumber: '2022002',
                name: 'Emily Davis',
                email: 'emily.davis@university.edu',
                password: 'Student@123',
                department: 'Physics',
                year: 2,
                registeredCourses: [
                    firstLevelCourses[1]._id, firstLevelCourses[2]._id, // MATH101, PHYS101
                    secondLevelCourses[2]._id, secondLevelCourses[3]._id // MATH201, PHYS201
                ]
            },
            {
                rollNumber: '2021001',
                name: 'Michael Wilson',
                email: 'michael.wilson@university.edu',
                password: 'Student@123',
                department: 'Computer Science',
                year: 3,
                registeredCourses: [
                    firstLevelCourses[0]._id, firstLevelCourses[1]._id, // CS101, MATH101
                    secondLevelCourses[0]._id, secondLevelCourses[1]._id, secondLevelCourses[2]._id, // CS201, CS202, MATH201
                    thirdLevelCourses[0]._id // CS301
                ],
                potentialSchedule: [
                    {
                        courseId: thirdLevelCourses[1]._id, // CS302
                        status: 'pending'
                    }
                ]
            },
            {
                rollNumber: '2021002',
                name: 'Sarah Brown',
                email: 'sarah.brown@university.edu',
                password: 'Student@123',
                department: 'Mathematics',
                year: 3,
                registeredCourses: [
                    firstLevelCourses[1]._id, // MATH101
                    secondLevelCourses[2]._id, // MATH201
                ],
                potentialSchedule: [
                    {
                        courseId: secondLevelCourses[0]._id, // CS201
                        status: 'pending'
                    }
                ]
            },
            {
                rollNumber: '2020001',
                name: 'David Miller',
                email: 'david.miller@university.edu',
                password: 'Student@123',
                department: 'Computer Science',
                year: 4,
                registeredCourses: [
                    firstLevelCourses[0]._id, firstLevelCourses[1]._id, // CS101, MATH101
                    secondLevelCourses[0]._id, secondLevelCourses[1]._id, secondLevelCourses[2]._id, // CS201, CS202, MATH201
                    thirdLevelCourses[0]._id, thirdLevelCourses[1]._id, // CS301, CS302
                    fourthLevelCourses[0]._id // CS401
                ]
            }
        ]);
        console.log('Created students:', students.map(s => s.rollNumber).join(', '));

        // Update courses with registered students
        await Promise.all(students.map(async (student) => {
            for (const courseId of student.registeredCourses) {
                await Course.findByIdAndUpdate(courseId, {
                    $push: { registeredStudents: student._id }
                });
            }
        }));
        console.log('Updated courses with registered students');

        console.log('Database initialization completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

initializeDatabase();