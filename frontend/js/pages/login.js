import { api } from '../api.js';
import { showAlert, setButtonLoading } from '../utils.js';
import { redirectIfLoggedIn } from '../auth.js';

redirectIfLoggedIn();

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('submit-btn');

  if (!email || !password) {
    showAlert('alert-area', 'Email and password are required.');
    return;
  }

  setButtonLoading(btn, true);

  try {
    await api.login({ email, password });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('alert-area', err.message || 'Login failed. Please try again.');
    setButtonLoading(btn, false);
  }
});
