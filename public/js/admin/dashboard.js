import { showToast, showSpinner, hideSpinner, apiRequest } from '../common.js';

// Initialize Socket.IO
const socket = io();
const user = JSON.parse(localStorage.getItem('user'));
socket.emit('join', 'admin');

// Global variables
let currentSection = 'overview';
let courses = [];
let students = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadInitialData();
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // Course Management
    document.getElementById('addScheduleEntry').addEventListener('click', addScheduleEntry);
    document.getElementById('saveCourseBtn').addEventListener('click', saveCourse);
    document.getElementById('updateCourseBtn').addEventListener('click', updateCourse);
    document.getElementById('updateSeatsBtn').addEventListener('click', updateSeats);

    // Reports
    document.getElementById('courseReportSelect').addEventListener('change', loadCourseReport);
}

async function loadInitialData() {
    showSpinner();
    try {
        await Promise.all([
            loadOverview(),
            loadCourses(),
            loadStudents(),
            loadSeats(),
            loadReports()
        ]);
    } catch (error) {
        showToast('Error loading data', 'danger');
    } finally {
        hideSpinner();
    }
}

async function loadOverview() {
    try {
        const [coursesData, studentsData] = await Promise.all([
            apiRequest('/admin/courses'),
            apiRequest('/admin/students')
        ]);

        document.getElementById('totalCourses').textContent = coursesData.length;
        document.getElementById('totalStudents').textContent = studentsData.length;
        document.getElementById('availableSeats').textContent = 
            coursesData.filter(course => course.availableSeats > 0).length;
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadCourses() {
    try {
        courses = await apiRequest('/admin/courses');
        displayCourses();
        updatePrerequisitesSelect();
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function displayCourses() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';

    courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${course.code}</td>
            <td>${course.name}</td>
            <td>${course.department}</td>
            <td>${course.level}</td>
            <td>${course.credits}</td>
            <td>${course.capacity}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editCourse('${course._id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadStudents() {
    try {
        students = await apiRequest('/admin/students');
        displayStudents();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function displayStudents() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.rollNumber}</td>
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.year}</td>
            <td>${student.registeredCourses.length}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewStudentSchedule('${student.rollNumber}')">
                    <i class="bi bi-calendar"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="overrideRegistration('${student.rollNumber}')">
                    <i class="bi bi-gear"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadSeats() {
    try {
        const seatsData = await apiRequest('/admin/courses');
        displaySeats(seatsData);
    } catch (error) {
        console.error('Error loading seats:', error);
    }
}

function displaySeats(courses) {
    const tbody = document.getElementById('seatsTableBody');
    tbody.innerHTML = '';

    courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${course.code}</td>
            <td>${course.name}</td>
            <td>${course.capacity}</td>
            <td>${course.enrolledStudents.length}</td>
            <td>${course.availableSeats}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editSeats('${course._id}', ${course.capacity})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadReports() {
    try {
        await loadPrerequisitesReport();
        updateCourseReportSelect();
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function loadPrerequisitesReport() {
    try {
        const students = await apiRequest('/admin/students');
        const courses = await apiRequest('/admin/courses');
        
        const missingPrerequisites = students.map(student => {
            const issues = [];
            student.registeredCourses.forEach(course => {
                const courseData = courses.find(c => c._id === course._id);
                if (courseData && courseData.prerequisites.length > 0) {
                    const missing = courseData.prerequisites.filter(prereq => 
                        !student.registeredCourses.some(reg => reg._id === prereq._id)
                    );
                    if (missing.length > 0) {
                        issues.push({
                            course: courseData.code,
                            missing: missing.map(m => m.code).join(', ')
                        });
                    }
                }
            });
            return { student, issues };
        }).filter(s => s.issues.length > 0);

        displayPrerequisitesReport(missingPrerequisites);
    } catch (error) {
        console.error('Error loading prerequisites report:', error);
    }
}

function displayPrerequisitesReport(data) {
    const container = document.getElementById('prerequisitesReportContent');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="text-success">No prerequisite issues found.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'list-group';

    data.forEach(({ student, issues }) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <strong>${student.name} (${student.rollNumber})</strong>
            <ul class="mb-0">
                ${issues.map(issue => `
                    <li>${issue.course}: Missing ${issue.missing}</li>
                `).join('')}
            </ul>
        `;
        list.appendChild(li);
    });

    container.appendChild(list);
}

function updateCourseReportSelect() {
    const select = document.getElementById('courseReportSelect');
    select.innerHTML = '<option value="">Select a course...</option>';
    
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id;
        option.textContent = `${course.code} - ${course.name}`;
        select.appendChild(option);
    });
}

async function loadCourseReport() {
    const courseId = document.getElementById('courseReportSelect').value;
    if (!courseId) return;

    try {
        const students = await apiRequest('/admin/students');
        const course = courses.find(c => c._id === courseId);
        
        const enrolledStudents = students.filter(student =>
            student.registeredCourses.some(c => c._id === courseId)
        );

        displayCourseReport(course, enrolledStudents);
    } catch (error) {
        console.error('Error loading course report:', error);
    }
}

function displayCourseReport(course, enrolledStudents) {
    const container = document.getElementById('courseReportContent');
    container.innerHTML = `
        <h6>Course Details</h6>
        <p>Code: ${course.code}<br>
        Name: ${course.name}<br>
        Department: ${course.department}<br>
        Level: ${course.level}<br>
        Credits: ${course.credits}<br>
        Capacity: ${course.capacity}<br>
        Enrolled: ${enrolledStudents.length}</p>
        
        <h6>Enrolled Students</h6>
        <ul class="list-group">
            ${enrolledStudents.map(student => `
                <li class="list-group-item">
                    ${student.name} (${student.rollNumber})
                </li>
            `).join('')}
        </ul>
    `;
}

// Course Management Functions
function addScheduleEntry() {
    const container = document.getElementById('scheduleFields');
    const index = container.children.length;
    
    const entry = document.createElement('div');
    entry.className = 'schedule-entry mb-2';
    entry.innerHTML = `
        <div class="row">
            <div class="col">
                <select class="form-select" name="schedule[${index}][day]" required>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                </select>
            </div>
            <div class="col">
                <input type="time" class="form-control" name="schedule[${index}][startTime]" required>
            </div>
            <div class="col">
                <input type="time" class="form-control" name="schedule[${index}][endTime]" required>
            </div>
            <div class="col">
                <input type="text" class="form-control" name="schedule[${index}][room]" required>
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(entry);
}

async function saveCourse() {
    const form = document.getElementById('addCourseForm');
    const formData = new FormData(form);
    
    try {
        const courseData = {
            code: formData.get('code'),
            name: formData.get('name'),
            department: formData.get('department'),
            level: parseInt(formData.get('level')),
            credits: parseInt(formData.get('credits')),
            capacity: parseInt(formData.get('capacity')),
            description: formData.get('description'),
            schedule: [],
            prerequisites: Array.from(formData.getAll('prerequisites'))
        };

        // Process schedule entries
        const scheduleEntries = form.querySelectorAll('.schedule-entry');
        scheduleEntries.forEach(entry => {
            const day = entry.querySelector('[name$="[day]"]').value;
            const startTime = entry.querySelector('[name$="[startTime]"]').value;
            const endTime = entry.querySelector('[name$="[endTime]"]').value;
            const room = entry.querySelector('[name$="[room]"]').value;
            
            courseData.schedule.push({ day, startTime, endTime, room });
        });

        await apiRequest('/admin/courses', {
            method: 'POST',
            body: JSON.stringify(courseData),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        showToast('Course added successfully');
        bootstrap.Modal.getInstance(document.getElementById('addCourseModal')).hide();
        form.reset();
        loadCourses();
    } catch (error) {
        showToast(error.message || 'Error adding course', 'danger');
    }
}

async function editCourse(courseId) {
    const course = courses.find(c => c._id === courseId);
    if (!course) return;

    const form = document.getElementById('editCourseForm');
    form.querySelector('[name="code"]').value = course.code;
    form.querySelector('[name="name"]').value = course.name;
    form.querySelector('[name="department"]').value = course.department;
    form.querySelector('[name="level"]').value = course.level;
    form.querySelector('[name="credits"]').value = course.credits;
    form.querySelector('[name="capacity"]').value = course.capacity;
    form.querySelector('[name="description"]').value = course.description;

    // Clear existing schedule entries
    const scheduleContainer = form.querySelector('#scheduleFields');
    scheduleContainer.innerHTML = '';

    // Add schedule entries
    course.schedule.forEach((slot, index) => {
        const entry = document.createElement('div');
        entry.className = 'schedule-entry mb-2';
        entry.innerHTML = `
            <div class="row">
                <div class="col">
                    <select class="form-select" name="schedule[${index}][day]" required>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                    </select>
                </div>
                <div class="col">
                    <input type="time" class="form-control" name="schedule[${index}][startTime]" required>
                </div>
                <div class="col">
                    <input type="time" class="form-control" name="schedule[${index}][endTime]" required>
                </div>
                <div class="col">
                    <input type="text" class="form-control" name="schedule[${index}][room]" required>
                </div>
                <div class="col-auto">
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        entry.querySelector('[name$="[day]"]').value = slot.day;
        entry.querySelector('[name$="[startTime]"]').value = slot.startTime;
        entry.querySelector('[name$="[endTime]"]').value = slot.endTime;
        entry.querySelector('[name$="[room]"]').value = slot.room;

        scheduleContainer.appendChild(entry);
    });

    // Set prerequisites
    const prerequisitesSelect = form.querySelector('[name="prerequisites"]');
    prerequisitesSelect.value = course.prerequisites.map(p => p._id);

    // Store course ID for update
    form.dataset.courseId = courseId;

    new bootstrap.Modal(document.getElementById('editCourseModal')).show();
}

async function updateCourse() {
    const form = document.getElementById('editCourseForm');
    const courseId = form.dataset.courseId;
    
    try {
        const formData = new FormData(form);
        const courseData = {
            code: formData.get('code'),
            name: formData.get('name'),
            department: formData.get('department'),
            level: parseInt(formData.get('level')),
            credits: parseInt(formData.get('credits')),
            capacity: parseInt(formData.get('capacity')),
            description: formData.get('description'),
            schedule: [],
            prerequisites: Array.from(formData.getAll('prerequisites'))
        };

        // Process schedule entries
        const scheduleEntries = form.querySelectorAll('.schedule-entry');
        scheduleEntries.forEach(entry => {
            const day = entry.querySelector('[name$="[day]"]').value;
            const startTime = entry.querySelector('[name$="[startTime]"]').value;
            const endTime = entry.querySelector('[name$="[endTime]"]').value;
            const room = entry.querySelector('[name$="[room]"]').value;
            
            courseData.schedule.push({ day, startTime, endTime, room });
        });

        await apiRequest(`/admin/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify(courseData),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        showToast('Course updated successfully');
        bootstrap.Modal.getInstance(document.getElementById('editCourseModal')).hide();
        loadCourses();
    } catch (error) {
        showToast(error.message || 'Error updating course', 'danger');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
        await apiRequest(`/admin/courses/${courseId}`, {
            method: 'DELETE'
        });

        showToast('Course deleted successfully');
        loadCourses();
    } catch (error) {
        showToast(error.message || 'Error deleting course', 'danger');
    }
}

// Seat Management Functions
function editSeats(courseId, currentCapacity) {
    const form = document.getElementById('editSeatsForm');
    form.querySelector('[name="courseId"]').value = courseId;
    form.querySelector('[name="capacity"]').value = currentCapacity;

    new bootstrap.Modal(document.getElementById('editSeatsModal')).show();
}

async function updateSeats() {
    const form = document.getElementById('editSeatsForm');
    const courseId = form.querySelector('[name="courseId"]').value;
    const newCapacity = parseInt(form.querySelector('[name="capacity"]').value);

    try {
        await apiRequest(`/admin/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify({ capacity: newCapacity }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        showToast('Course capacity updated successfully');
        bootstrap.Modal.getInstance(document.getElementById('editSeatsModal')).hide();
        loadSeats();
    } catch (error) {
        showToast(error.message || 'Error updating course capacity', 'danger');
    }
}

// Student Management Functions
async function viewStudentSchedule(rollNumber) {
    try {
        const schedule = await apiRequest(`/admin/schedules/${rollNumber}`);
        const student = students.find(s => s.rollNumber === rollNumber);
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${student.name}'s Schedule</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="list-group">
                            ${schedule.map(course => `
                                <li class="list-group-item">
                                    <strong>${course.code} - ${course.name}</strong><br>
                                    ${course.schedule.map(slot => 
                                        `${slot.day}: ${slot.startTime} - ${slot.endTime} (${slot.room})`
                                    ).join('<br>')}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        new bootstrap.Modal(modal).show();
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    } catch (error) {
        showToast(error.message || 'Error loading student schedule', 'danger');
    }
}

async function overrideRegistration(rollNumber) {
    try {
        const student = students.find(s => s.rollNumber === rollNumber);
        const courses = await apiRequest('/admin/courses');
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Override Registration for ${student.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Select Course</label>
                            <select class="form-select" id="overrideCourseSelect">
                                <option value="">Select a course...</option>
                                ${courses.map(course => `
                                    <option value="${course._id}">
                                        ${course.code} - ${course.name} (${course.availableSeats} seats available)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Action</label>
                            <select class="form-select" id="overrideAction">
                                <option value="add">Add to Course</option>
                                <option value="remove">Remove from Course</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" id="confirmOverrideBtn" class="btn btn-primary" onclick="submitOverride('${rollNumber}')">
                            Apply Override
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        new bootstrap.Modal(modal).show();
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    } catch (error) {
        showToast(error.message || 'Error loading override options', 'danger');
    }
}

async function submitOverride(rollNumber) {
    const courseId = document.getElementById('overrideCourseSelect').value;
    const action = document.getElementById('overrideAction').value;

    if (!courseId) {
        showToast('Please select a course', 'warning');
        return;
    }

    try {
        await apiRequest(`/admin/students/${rollNumber}/override`, {
            method: 'POST',
            body: JSON.stringify({ courseId, action }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        showToast('Registration override applied successfully');
        bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
        loadStudents();
        loadSeats();
    } catch (error) {
        showToast(error.message || 'Error applying override', 'danger');
    }
}

// Navigation Functions
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    document.getElementById(`${sectionId}Section`).classList.remove('d-none');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    currentSection = sectionId;
}

// Make functions available globally
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.editSeats = editSeats;
window.viewStudentSchedule = viewStudentSchedule;
window.overrideRegistration = overrideRegistration;
window.submitOverride = submitOverride;
window.addScheduleEntry = addScheduleEntry; 