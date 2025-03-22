# University Course Registration System

A modern, interactive course registration system built to address common frustrations in university course registration processes. This system provides real-time updates, interactive scheduling, and comprehensive course management features for both students and administrators.

## Features

### Student Features
- **Secure Login**: Roll number-based authentication
- **Interactive Calendar**: Dynamic weekly schedule view with real-time conflict detection
- **Real-time Updates**: Live seat availability updates without page refreshes
- **Advanced Course Search**: Filter courses by department, level, time, and availability
- **Session Persistence**: Maintain schedule progress throughout the session
- **Prerequisite Management**: Clear visualization of course prerequisites
- **Seat Notifications**: Subscribe to notifications for course availability

### Admin Features
- **Comprehensive Course Management**: Add, update, and delete courses
- **Student Management**: View and override student registrations
- **Seat Management**: Adjust course capacities
- **Reporting Tools**: Generate various administrative reports

## Technology Stack
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js with Express
- Database: MongoDB
- Real-time Updates: Socket.IO
- UI Framework: Bootstrap 5

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/course-registration-system.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with the following variables:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Project Structure
```
course-registration-system/
├── public/
│   ├── css/
│   │   ├── admin.css
│   │   └── student.css
│   ├── js/
│   │   ├── admin/
│   │   └── student/
│   └── images/
├── views/
│   ├── admin/
│   ├── student/
│   └── auth/
├── routes/
├── models/
├── controllers/
├── middleware/
├── config/
├── server.js
└── package.json
```

## API Documentation

### Student Endpoints
- `POST /api/auth/login`: Student login
- `GET /api/courses`: Get available courses
- `POST /api/students/schedule`: Update student schedule
- `GET /api/students/prerequisites`: Check prerequisites

### Admin Endpoints
- `POST /api/admin/login`: Admin login
- `CRUD /api/admin/courses`: Course management
- `GET /api/admin/reports`: Generate reports
- `POST /api/admin/override`: Override registration

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## GitHub Repository
[Course Registration System Repository](https://github.com/yourusername/course-registration-system)

## License
This project is licensed under the MIT License - see the LICENSE file for details. 