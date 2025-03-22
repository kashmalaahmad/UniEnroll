// Common utility functions and shared code
const API_BASE_URL = '/api';

// Toast notification function
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Loading spinner functions
function showSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.id = 'loadingSpinner';
    document.body.appendChild(spinner);
}

function hideSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    // Get token from localStorage
    const token = localStorage.getItem('studentToken') || localStorage.getItem('adminToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Clear tokens and redirect to login
                localStorage.removeItem('studentToken');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('student');
                localStorage.removeItem('admin');
                window.location.href = endpoint.includes('/admin') ? '/admin/login' : '/student/login';
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Export common functions
export {
    showToast,
    showSpinner,
    hideSpinner,
    apiRequest
}; 