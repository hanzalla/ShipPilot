import { api } from '../api.js';
import { showAlert, setButtonLoading } from '../utils.js';
import { redirectIfLoggedIn } from '../auth.js';

redirectIfLoggedIn();

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('submit-btn');

  if (!name || !email || !password) {
    showAlert('alert-area', 'All fields are required.');
    return;
  }
  if (password.length < 8) {
    showAlert('alert-area', 'Password must be at least 8 characters.');
    return;
  }

  setButtonLoading(btn, true);

  try {
    await api.register({ name, email, password });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('alert-area', err.message || 'Registration failed.');
    setButtonLoading(btn, false);
  }
});
