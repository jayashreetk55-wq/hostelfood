/**
 * auth.js — Login form, logout, session check
 */

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('login-form');
  const emailInput  = document.getElementById('login-email');
  const passInput   = document.getElementById('login-password');
  const submitBtn   = document.getElementById('login-submit');
  const errorEl     = document.getElementById('login-error');
  const logoutBtn   = document.getElementById('logout-btn');

  // ── Login Form ────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

      try {
        await api.login({ email: emailInput.value.trim(), password: passInput.value });
        window.location.href = '/dashboard.html';
      } catch (err) {
        errorEl.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
      }
    });
  }

  // ── Logout Button ─────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api.logout();
      } finally {
        window.location.href = '/dashboard.html';
      }
    });
  }
});
