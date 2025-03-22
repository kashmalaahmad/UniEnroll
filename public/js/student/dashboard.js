document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    initializeUI();
    console.log('loading student data');
    // Load student data
    loadStudentData();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize UI elements
function initializeUI() {
    // Show loading spinner initially
    showLoadingSpinner(true);
    
    // Initialize toast container
    if (!document.querySelector('.toast-container')) {
        createToastContainer();
    }
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleLogout);
        }
    });
    
    // Set up course filter event listeners
    setupFilterEventListeners();
}

// Set up event listeners for filter controls
function setupFilterEventListeners() {
    // Set up event listeners for the filter controls
    const filterControls = [
        'departmentFilter',
        'levelFilter',
        'timeFilter',
        'daysFilter',
        'seatsFilter'
    ];
    
    filterControls.forEach(control => {
        const element = document.getElementById(control);
        if (element) {
            element.addEventListener('change', filterCourses);
        }
    });
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/student/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/student/login';
        } else {
            showToast('Error logging out', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/student/login';
    }
}

// Load student data
async function loadStudentData() {
    try {
        const response = await fetch('/api/student/profile', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/student/login';
                return;
            }
            throw new Error('Failed to load student data');
        }
        
        const data = await response.json();
        console.log('Student profile data received:', data);
        console.log('Passing data to updateStudentInfo:', JSON.stringify(data, null, 2));
        updateStudentInfo(data);
        
        // Load additional data
        await Promise.all([
            loadRegisteredCourses(),
            loadWeeklySchedule(),
            loadAvailableCourses()
        ]);
        
        showToast('Dashboard loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading student data:', error);
        showToast('Error loading dashboard data', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// Update student information in UI
function updateStudentInfo(data) {
    // Make sure we're accessing the profile object first
    const profile = data.profile || {};
    
    const elements = {
        'studentName': profile.name || 'Student',
        'department': profile.department || 'N/A',
        'year': profile.year || 'N/A',
        'studentId': profile.id || 'N/A'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load registered courses
async function loadRegisteredCourses() {
    try {
        // Use the correct endpoint that exists in your routes
        const response = await fetch('/api/student/courses/registered', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load registered courses');
        }
        
        const data = await response.json();
        console.log('Registered courses data received:', data);
        
        // Get the container for displaying courses
        const coursesContainer = document.getElementById('registeredCourses');
        if (!coursesContainer) {
            console.error('Registered courses container not found in the DOM');
            return;
        }
        
        // Clear existing content
        coursesContainer.innerHTML = '';
        
        // Get registered courses from the response - note the data structure
        const courses = data.courses || [];
        
        if (courses.length === 0) {
            coursesContainer.innerHTML = '<div class="empty-state">No courses registered yet.</div>';
            return;
        }
        
        // Create a list to display course names only
        const courseList = document.createElement('ul');
        courseList.className = 'courses-list';
        courseList.style.fontSize = '0.85rem'; // Smaller font size
        
        // Add each course name to the list
        courses.forEach(course => {
            const item = document.createElement('li');
            item.textContent = course.name;
            item.style.margin = '0.5rem 0'; // Add some spacing between items
            courseList.appendChild(item);
        });
        
        coursesContainer.appendChild(courseList);
        
    } catch (error) {
        console.error('Error loading registered courses:', error);
        showToast('Error loading registered courses', 'error');
    }
}

// Update courses list in UI
function updateCoursesList(courses) {
    const coursesList = document.getElementById('coursesList');
    
    if (coursesList) {
        coursesList.innerHTML = courses.map(course => `
            <div class="course-item">
                <h5>${course.name}</h5>
                <p>${course.code} - ${course.credits} credits</p>
                <p>${course.schedule}</p>
            </div>
        `).join('');
    }
}

// Load and display weekly schedule
async function loadWeeklySchedule() {
    try {
        const response = await fetch('/api/student/schedule', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load schedule');
        }
        
        const scheduleData = await response.json();
        
        // Generate the weekly schedule view
        populateWeeklyCalendar(scheduleData);
    } catch (error) {
        console.error('Error loading schedule:', error);
        showToast('Error loading weekly schedule', 'error');
    }
}

// Populate the weekly calendar with schedule data
function populateWeeklyCalendar(scheduleData) {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;
    
    // Clear existing time slots (except headers)
    const headers = Array.from(calendarGrid.querySelectorAll('.calendar-header'));
    calendarGrid.innerHTML = '';
    
    // Re-add the headers
    headers.forEach(header => {
        calendarGrid.appendChild(header);
    });
    
    // Define time slots (8 AM to 6 PM)
    const timeSlots = [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
    ];
    
    // Days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Add time slots
    timeSlots.forEach(time => {
        // Add time cell
        const timeCell = document.createElement('div');
        timeCell.className = 'calendar-cell';
        timeCell.textContent = time;
        calendarGrid.appendChild(timeCell);
        
        // Add day cells for this time slot
        days.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-cell';
            
            // Find courses for this day and time
            const coursesForSlot = scheduleData.filter(course => {
                return course.day === day && isTimeInSlot(course.startTime, time);
            });
            
            if (coursesForSlot.length > 0) {
                coursesForSlot.forEach(course => {
                    const courseElement = document.createElement('div');
                    courseElement.className = 'course-slot';
                    courseElement.style.backgroundColor = getRandomColor(course.courseCode);
                    courseElement.innerHTML = `
                        <strong>${course.courseCode}</strong>
                        <div>${course.startTime} - ${course.endTime}</div>
                        <div>${course.location}</div>
                    `;
                    dayCell.appendChild(courseElement);
                });
            }
            
            calendarGrid.appendChild(dayCell);
        });
    });
}

// Helper function to check if a course time falls within a time slot
function isTimeInSlot(courseTime, slotTime) {
    // Parse the course and slot times
    const [courseHourStr, courseMinStr] = courseTime.split(':');
    let courseHour = parseInt(courseHourStr);
    const courseMin = parseInt(courseMinStr.split(' ')[0]);
    const coursePeriod = courseMinStr.includes('PM') ? 'PM' : 'AM';
    
    const [slotHourStr, slotMinStr] = slotTime.split(':');
    let slotHour = parseInt(slotHourStr);
    const slotMin = parseInt(slotMinStr.split(' ')[0]);
    const slotPeriod = slotMinStr.includes('PM') ? 'PM' : 'AM';
    
    // Convert to 24-hour format
    if (coursePeriod === 'PM' && courseHour !== 12) courseHour += 12;
    if (coursePeriod === 'AM' && courseHour === 12) courseHour = 0;
    if (slotPeriod === 'PM' && slotHour !== 12) slotHour += 12;
    if (slotPeriod === 'AM' && slotHour === 12) slotHour = 0;
    
    // Check if the course time is within the slot time range (slot to slot+1)
    return courseHour === slotHour;
}

// Helper function to generate a consistent color for a course code
function getRandomColor(str) {
    // Generate a hash from the string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate color based on the hash
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
}

// Load available courses for registration
// Load available courses for registration
async function loadAvailableCourses() {
    try {
        const response = await fetch('/api/student/courses', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load available courses');
        }
        
        const data = await response.json();
        console.log("Raw courses data:", data);
        
        // Handle different possible structures
        const coursesArray = Array.isArray(data) ? data : 
                             data.courses ? data.courses :
                             data.data ? data.data.courses || data.data : 
                             [];
                             
        if (!Array.isArray(coursesArray)) {
            console.error("Could not extract courses array from:", data);
            return []; // Return empty array as fallback
        }
        
        // Store courses globally so they can be accessed by filter functions
        window.availableCourses = coursesArray;
        
        // Populate filter dropdowns
        populateFilterOptions(coursesArray);
        
        // Display all courses initially
        displayAvailableCourses(coursesArray);
        
        return coursesArray;
    } catch (error) {
        console.error("Error loading available courses:", error);
        showToast('Error loading available courses', 'error');
        return []; // Return empty array on error
    }
}
// Populate filter dropdowns based on available data
function populateFilterOptions(courses) {
    // Populate department filter
    const departments = [...new Set(courses.map(course => course.department))];
    populateFilterDropdown('departmentFilter', departments);
    
    // Populate course level filter
    const levels = [...new Set(courses.map(course => course.level))];
    populateFilterDropdown('levelFilter', levels);
}

// Helper function to populate a filter dropdown
function populateFilterDropdown(filterId, options) {
    const filter = document.getElementById(filterId);
    if (!filter) return;
    
    // Keep the first option (usually "All X")
    const defaultOption = filter.options[0];
    filter.innerHTML = '';
    filter.appendChild(defaultOption);
    
    // Add new options
    options.sort().forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.toLowerCase();
        optionElement.textContent = option;
        filter.appendChild(optionElement);
    });
}

// Display available courses in the course list
function displayAvailableCourses(courses) {
    const courseList = document.getElementById('courseList');
    if (!courseList) return;
    
    if (courses.length === 0) {
        courseList.innerHTML = '<div class="empty-message">No courses available matching your criteria.</div>';
        return;
    }
    
    courseList.innerHTML = courses.map(course => `
        <div class="course-card">
            <h3>${course.name} <span class="course-code">${course.code}</span></h3>
            <p><strong>Department:</strong> ${course.department}</p>
            <p><strong>Level:</strong> ${course.level}</p>
            <p><strong>Credits:</strong> ${course.credits}</p>
            <p><strong>Schedule:</strong> ${formatSchedule(course.schedule)}</p>
            <p><strong>Instructor:</strong> ${course.instructor}</p>
            <p><strong>Location:</strong> ${course.location}</p>
            
            <div class="seat-info">
                <span class="seats ${getSeatStatusClass(course.availableSeats, course.totalSeats)}">
                    ${course.availableSeats} seats available out of ${course.totalSeats}
                </span>
            </div>
            
            <button class="register-btn" data-course-id="${course.id}" onclick="registerForCourse('${course.id}')">
                Register
            </button>
        </div>
    `).join('');
}

// Format course schedule for display
function formatSchedule(schedule) {
    if (!schedule || !Array.isArray(schedule)) return 'Schedule not available';
    
    return schedule.map(slot => {
        return `${slot.day} ${slot.startTime} - ${slot.endTime}`;
    }).join('<br>');
}

// Determine CSS class based on seat availability
function getSeatStatusClass(available, total) {
    const percentage = (available / total) * 100;
    
    if (available === 0) return 'full';
    if (percentage <= 20) return 'limited';
    return 'available';
}

// Filter courses based on selected criteria
function filterCourses() {
    if (!window.availableCourses) return;
    
    const filters = {
        department: document.getElementById('departmentFilter')?.value || '',
        level: document.getElementById('levelFilter')?.value || '',
        time: document.getElementById('timeFilter')?.value || '',
        day: document.getElementById('daysFilter')?.value || '',
        seats: document.getElementById('seatsFilter')?.value || ''
    };
    
    // Filter the courses based on selected criteria
    const filteredCourses = window.availableCourses.filter(course => {
        // Department filter
        if (filters.department && course.department.toLowerCase() !== filters.department) {
            return false;
        }
        
        // Level filter
        if (filters.level && course.level.toLowerCase() !== filters.level) {
            return false;
        }
        
        // Time of day filter
        if (filters.time && !isTimeOfDay(course.schedule, filters.time)) {
            return false;
        }
        
        // Day filter
        if (filters.day && !includesDay(course.schedule, filters.day)) {
            return false;
        }
        
        // Seat availability filter
        if (filters.seats) {
            const seatPercentage = (course.availableSeats / course.totalSeats) * 100;
            
            switch (filters.seats) {
                case 'available':
                    if (course.availableSeats === 0) return false;
                    break;
                case 'waitlist':
                    if (seatPercentage > 20 || course.availableSeats === 0) return false;
                    break;
                case 'full':
                    if (course.availableSeats > 0) return false;
                    break;
            }
        }
        
        return true;
    });
    
    // Display the filtered courses
    displayAvailableCourses(filteredCourses);
}

// Check if course schedule includes specified time of day
function isTimeOfDay(schedule, timeOfDay) {
    if (!schedule || !Array.isArray(schedule)) return false;
    
    return schedule.some(slot => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        const isPM = slot.startTime.toLowerCase().includes('pm');
        
        // Convert to 24-hour format
        let hour24 = hour;
        if (isPM && hour !== 12) hour24 += 12;
        if (!isPM && hour === 12) hour24 = 0;
        
        switch (timeOfDay) {
            case 'morning': // Before noon
                return hour24 < 12;
            case 'afternoon': // Noon to 5pm
                return hour24 >= 12 && hour24 < 17;
            case 'evening': // 5pm and later
                return hour24 >= 17;
            default:
                return false;
        }
    });
}

// Check if course schedule includes specified day
function includesDay(schedule, day) {
    if (!schedule || !Array.isArray(schedule)) return false;
    
    return schedule.some(slot => {
        return slot.day.toLowerCase() === day;
    });
}

// Register for a course
async function registerForCourse(courseId) {
    try {
        showLoadingSpinner(true);
        
        const response = await fetch('/api/student/courses/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ courseId })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to register for course');
        }
        
        // Show success message
        showToast('Successfully registered for course', 'success');
        
        // Refresh available courses and registered courses
        await Promise.all([
            loadAvailableCourses(),
            loadRegisteredCourses(),
            loadWeeklySchedule()
        ]);
    } catch (error) {
        console.error('Error registering for course:', error);
        showToast(error.message || 'Error registering for course', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// Show/hide loading spinner
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Create toast container
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Make the register function available globally
window.registerForCourse = registerForCourse;