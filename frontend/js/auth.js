import { api } from './api.js';

export async function requireAuth() {
  try {
    const user = await api.me();
    return user;
  } catch {
    window.location.href = 'index.html';
    return null;
  }
}

export async function redirectIfLoggedIn() {
  try {
    await api.me();
    window.location.href = 'dashboard.html';
  } catch {
    // not logged in — stay on login page
  }
}
