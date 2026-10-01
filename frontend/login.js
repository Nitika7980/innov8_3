/**
 * LexShield AI — Login & Registration JavaScript
 * Handles tab switching, form validation, password strength meter,
 * API calls for login/register, and session management.
 */

// ================================================
// TAB SWITCHING
// ================================================
function switchAuthTab(tab) {
  const loginTab = document.getElementById('tabLogin');
  const registerTab = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const indicator = document.getElementById('tabIndicator');

  // Clear errors/success
  clearMessages();

  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    indicator.classList.remove('slide-right');
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    indicator.classList.add('slide-right');
  }
}

function clearMessages() {
  ['loginError', 'loginSuccess', 'registerError', 'registerSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.textContent = '';
    }
  });
}

// ================================================
// PASSWORD VISIBILITY TOGGLE
// ================================================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ================================================
// PASSWORD STRENGTH METER
// ================================================
function updatePasswordStrength(password) {
  const fill = document.getElementById('pwStrengthFill');
  const label = document.getElementById('pwStrengthLabel');

  if (!password) {
    fill.style.width = '0%';
    fill.style.background = 'transparent';
    label.textContent = '';
    return;
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { max: 2, width: '20%', color: '#ef4444', text: 'Weak', textColor: '#ef4444' },
    { max: 3, width: '40%', color: '#f59e0b', text: 'Fair', textColor: '#f59e0b' },
    { max: 4, width: '65%', color: '#3b82f6', text: 'Good', textColor: '#3b82f6' },
    { max: 5, width: '85%', color: '#10b981', text: 'Strong', textColor: '#10b981' },
    { max: 7, width: '100%', color: '#10b981', text: 'Excellent', textColor: '#10b981' }
  ];

  const level = levels.find(l => score <= l.max) || levels[levels.length - 1];
  fill.style.width = level.width;
  fill.style.background = level.color;
  label.textContent = level.text;
  label.style.color = level.textColor;
}

// ================================================
// LOGIN
// ================================================
async function handleLogin(e) {
  e.preventDefault();
  clearMessages();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const successEl = document.getElementById('loginSuccess');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  if (!email || !password) {
    showError(errorEl, 'Please enter your email and password.');
    return;
  }

  btnText.textContent = 'Signing in...';
  spinner.classList.remove('hidden');

  try {
    const resp = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      // Save session
      sessionStorage.setItem('lexshield_user_token', data.token);
      sessionStorage.setItem('lexshield_user_data', JSON.stringify(data.user));

      showSuccess(successEl, data.message || 'Login successful! Redirecting...');

      // Redirect to main app after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } else {
      showError(errorEl, data.detail || data.error || 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    showError(errorEl, 'Cannot connect to server. Please ensure the backend is running.');
  }

  btnText.textContent = 'Sign In';
  spinner.classList.add('hidden');
}

// ================================================
// REGISTRATION
// ================================================
async function handleRegister(e) {
  e.preventDefault();
  clearMessages();

  const fullName = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const organization = document.getElementById('regOrg').value.trim();
  const role = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const terms = document.getElementById('regTerms').checked;

  const errorEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  const btnText = document.getElementById('registerBtnText');
  const spinner = document.getElementById('registerSpinner');

  // Client-side validation
  if (!fullName) {
    showError(errorEl, 'Please enter your full name.');
    return;
  }
  if (!email) {
    showError(errorEl, 'Please enter your email address.');
    return;
  }
  if (!password) {
    showError(errorEl, 'Please create a password.');
    return;
  }
  if (password !== confirm) {
    showError(errorEl, 'Passwords do not match. Please re-enter.');
    return;
  }
  if (password.length < 8) {
    showError(errorEl, 'Password must be at least 8 characters long.');
    return;
  }
  if (!terms) {
    showError(errorEl, 'Please agree to the Terms of Service to continue.');
    return;
  }

  btnText.textContent = 'Creating account...';
  spinner.classList.remove('hidden');

  try {
    const resp = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        organization,
        role
      })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      // Save session
      sessionStorage.setItem('lexshield_user_token', data.token);
      sessionStorage.setItem('lexshield_user_data', JSON.stringify(data.user));

      showSuccess(successEl, data.message || 'Account created! Redirecting...');

      // Redirect to main app
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } else {
      showError(errorEl, data.detail || data.error || 'Registration failed. Please try again.');
    }
  } catch (err) {
    showError(errorEl, 'Cannot connect to server. Please ensure the backend is running.');
  }

  btnText.textContent = 'Create Account';
  spinner.classList.add('hidden');
}

// ================================================
// HELPERS
// ================================================
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showSuccess(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ================================================
// SESSION CHECK — redirect if already logged in
// ================================================
(function checkExistingSession() {
  const token = sessionStorage.getItem('lexshield_user_token');
  if (token) {
    // Already logged in, redirect to main app
    window.location.href = '/';
  }
})();
