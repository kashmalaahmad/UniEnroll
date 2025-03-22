import { showToast, showSpinner, hideSpinner, apiRequest } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const rollNumberInput = document.getElementById('rollNumber');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showSpinner();

        try {
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    rollNumber: rollNumberInput.value
                })
            });

            // Store token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.student));

            // Redirect based on user role
            window.location.href = '/student/dashboard';
        } catch (error) {
            showToast(error.message || 'Login failed', 'danger');
        } finally {
            hideSpinner();
        }
    });
}); 