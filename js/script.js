// =============================================
// DOM ELEMENTS
// =============================================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInBtn = document.getElementById('signInBtn');
const errorMessage = document.getElementById('errorMessage');
const togglePassword = document.getElementById('togglePassword');
const keepLoggedIn = document.getElementById('keepLoggedIn');
const themeToggle = document.getElementById('themeToggle');

// =============================================
// PASSWORD TOGGLE FUNCTIONALITY
// =============================================
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Update icon
    if (type === 'text') {
        this.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
            </svg>
        `;
    } else {
        this.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
            </svg>
        `;
    }
});

// =============================================
// THEME TOGGLE FUNCTIONALITY
// =============================================
themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');

    // Save preference to localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        this.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
            </svg>
        `;
    } else {
        localStorage.setItem('theme', 'light');
        this.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
            </svg>
        `;
    }
});

// Load saved theme preference
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
            </svg>
        `;
    }
});

// =============================================
// FORGOT PASSWORD ELEMENTS & LOGIC
// =============================================
const forgotPasswordToggle = document.getElementById('forgotPasswordToggle');
const forgotPasswordSection = document.getElementById('forgotPasswordSection');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const resetEmailInput = document.getElementById('resetEmail');
const sendResetBtn = document.getElementById('sendResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');

forgotPasswordToggle.addEventListener('click', function (e) {
    e.preventDefault();
    if (emailInput.value.trim()) {
        resetEmailInput.value = emailInput.value.trim();
    }
    forgotPasswordSection.style.display = 'block';
    forgotPasswordLink.style.display = 'none';
    errorMessage.style.display = 'none';
});

cancelResetBtn.addEventListener('click', function () {
    forgotPasswordSection.style.display = 'none';
    forgotPasswordLink.style.display = 'block';
    errorMessage.style.display = 'none';
});

sendResetBtn.addEventListener('click', async function () {
    const email = resetEmailInput.value.trim();
    if (!email) {
        showError('Please enter your email address.');
        return;
    }

    sendResetBtn.disabled = true;
    const originalText = sendResetBtn.innerHTML;
    sendResetBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('Password reset email sent! Check your inbox.');
        setTimeout(() => {
            forgotPasswordSection.style.display = 'none';
            forgotPasswordLink.style.display = 'block';
        }, 3000);
    } catch (error) {
        console.error('Password reset error:', error);
        switch (error.code) {
            case 'auth/invalid-email':
                showError('Invalid email address format.');
                break;
            case 'auth/user-not-found':
                showSuccess('If an account exists with this email, a reset link has been sent.');
                break;
            case 'auth/too-many-requests':
                showError('Too many requests. Please try again later.');
                break;
            default:
                showError('Error sending reset email. Please try again.');
        }
    } finally {
        sendResetBtn.disabled = false;
        sendResetBtn.innerHTML = originalText;
    }
});

// =============================================
// FIREBASE AUTHENTICATION - LOGIN
// =============================================
loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Hide previous error messages
    errorMessage.style.display = 'none';
    emailInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');

    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validate email
    if (!email) {
        emailInput.classList.add('is-invalid');
        showError('Please enter your email address.');
        emailInput.focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailInput.classList.add('is-invalid');
        showError('Please enter a valid email address.');
        emailInput.focus();
        return;
    }

    // Validate password
    if (!password) {
        passwordInput.classList.add('is-invalid');
        showError('Please enter your password.');
        passwordInput.focus();
        return;
    }

    if (password.length < 6) {
        passwordInput.classList.add('is-invalid');
        showError('Password must be at least 6 characters.');
        passwordInput.focus();
        return;
    }

    // Disable submit button and show loading state
    signInBtn.disabled = true;
    const originalButtonText = signInBtn.innerHTML;
    signInBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

    try {
        // Set persistence based on "Keep me logged in" checkbox
        const persistence = keepLoggedIn.checked
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);

        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Verify user is an admin
        let adminDoc;
        try {
            adminDoc = await db.collection('admins').doc(user.uid).get();
        } catch (firestoreError) {
            // Firestore permission-denied means user is not an admin
            await auth.signOut();
            showError('Access denied. You are not an admin.');
            signInBtn.disabled = false;
            signInBtn.innerHTML = originalButtonText;
            return;
        }

        if (!adminDoc.exists) {
            await auth.signOut();
            showError('Access denied. You are not an admin.');
            signInBtn.disabled = false;
            signInBtn.innerHTML = originalButtonText;
            return;
        }

        // Store admin info
        localStorage.setItem('adminEmail', user.email);
        localStorage.setItem('adminRole', adminDoc.data().role);

        // Show success message
        showSuccess('Login successful! Redirecting to dashboard...');

        // Redirect to admin dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);

        // Re-enable button
        signInBtn.disabled = false;
        signInBtn.innerHTML = originalButtonText;
    }
});

// =============================================
// ERROR HANDLING
// =============================================
function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';

    switch (error.code) {
        case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email address.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
            message = 'Incorrect email or password. Please try again.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed login attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your internet connection.';
            break;
        case 'auth/operation-not-allowed':
            message = 'Email/password sign-in is not enabled. Please contact support.';
            break;
        default:
            message = 'An unexpected error occurred. Please try again.';
    }

    showError(message);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.className = 'alert alert-danger mt-3';
}

function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.className = 'alert alert-success mt-3';
}

// =============================================
// INPUT VALIDATION
// =============================================
emailInput.addEventListener('input', function () {
    errorMessage.style.display = 'none';
    this.classList.remove('is-invalid');
});

passwordInput.addEventListener('input', function () {
    errorMessage.style.display = 'none';
    this.classList.remove('is-invalid');
});

