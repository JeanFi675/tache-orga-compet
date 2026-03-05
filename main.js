import './style.css'
import { initDashboard } from './dashboard.js';

// Logic for Gatekeeper
const loginForm = document.getElementById('login-form');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');

// We simulate checking the password from GitHub secrets/Local Env Variable
const CORRECT_PASSWORD = import.meta.env.VITE_GATEKEEPER_PASSWORD;

function handleLogin(e) {
  e.preventDefault();
  const pwd = loginPasswordInput.value;
  
  if (pwd === CORRECT_PASSWORD) {
    // Hide login, show dashboard
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    loginError.classList.add('hidden');
    
    // Initialize Dashboard data load
    initDashboard();
    console.log("Accès Autorisé !");
  } else {
    loginError.classList.remove('hidden');
    // Brutalist error effect
    loginError.style.transform = 'translate(2px, 0)';
    setTimeout(() => loginError.style.transform = 'translate(0, 0)', 100);
  }
}

loginForm.addEventListener('submit', handleLogin);
