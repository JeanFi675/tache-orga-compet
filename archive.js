import { fetchMissions, fetchTaches, fetchReferents, updateMission } from './api.js';

let missionsData = [];
let tachesData = [];
let referentsData = [];

const container = document.getElementById('missions-container');
const filterReferent = document.getElementById('filter-referent');
const filterDate = document.getElementById('filter-date');
const loginView = document.getElementById('login-view');
const archiveView = document.getElementById('archive-view');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

// Simple gatekeeper (shared logic with primary app)
const GATEKEEPER_PASSWORD = import.meta.env.VITE_GATEKEEPER_PASSWORD || "escalade2026";

// Check session on load
if (sessionStorage.getItem('isLoggedIn') === 'true') {
  loginView.classList.add('hidden');
  archiveView.classList.remove('hidden');
  initArchive();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (passwordInput.value === GATEKEEPER_PASSWORD) {
    sessionStorage.setItem('isLoggedIn', 'true');
    loginView.classList.add('hidden');
    archiveView.classList.remove('hidden');
    initArchive();
  } else {
    loginError.classList.remove('hidden');
  }
});

async function initArchive() {
  container.innerHTML = '<p style="font-size: 1.5rem; font-weight: bold; animation: blink 1s infinite alternate;">Chargement des archives...</p>';
  try {
    // 1. Fetch ARCHIVED data
    [missionsData, referentsData] = await Promise.all([
      fetchMissions(true), // archived = true
      fetchReferents()
    ]);

    const taskPromises = missionsData.map(m => fetchTaches(m.Id));
    const tasksResults = await Promise.all(taskPromises);
    tachesData = tasksResults.flat();

    populateReferentFilter();
    populateDateFilter();
    renderArchive();

    filterReferent.addEventListener('change', renderArchive);
    filterDate.addEventListener('change', renderArchive);
  } catch (err) {
    container.innerHTML = '<p style="color:red;">Erreur de chargement.</p>';
    console.error(err);
  }
}

function populateReferentFilter() {
  while (filterReferent.options.length > 1) filterReferent.remove(1);
  referentsData.forEach(ref => {
    const opt = document.createElement('option');
    opt.value = ref.Id;
    opt.textContent = ref.nom;
    filterReferent.appendChild(opt);
  });
}

function populateDateFilter() {
  while (filterDate.options.length > 1) filterDate.remove(1);
  const uniqueDateTimes = [...new Set(missionsData.map(m => m.date_debut).filter(d => d !== null))].sort();
  uniqueDateTimes.forEach(dtStr => {
    const d = new Date(dtStr);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const opt = document.createElement('option');
    opt.value = dtStr;
    opt.textContent = label;
    filterDate.appendChild(opt);
  });
}

function getMissionAssigneesNames(referentIds) {
  if (!Array.isArray(referentIds) || referentIds.length === 0) return ["Non assigné"];
  return referentIds.map(idObj => {
    const ref = referentsData.find(r => r.Id === idObj.Id);
    return ref ? ref.nom : "Inconnu";
  });
}

function renderArchive() {
  const selectedRef = filterReferent.value;
  const selectedDate = filterDate.value;
  
  container.innerHTML = '';
  
  missionsData.forEach(mission => {
    if (selectedDate && mission.date_debut !== selectedDate) return;

    let mTasks = tachesData.filter(t => t.missions_id === mission.Id);
    
    let missionMatchesRef = false;
    if (selectedRef === 'ALL') {
      missionMatchesRef = true;
    } else {
      const missionRefs = mission.Referents_Assignes;
      if (Array.isArray(missionRefs) && missionRefs.find(r => r.Id == selectedRef)) {
        missionMatchesRef = true;
      }
      if (!missionMatchesRef) {
        let matchingTasks = mTasks.filter(t => t.referents_id == selectedRef);
        if (matchingTasks.length > 0) missionMatchesRef = true;
      }
    }
    
    if (!missionMatchesRef) return;

    const card = document.createElement('div');
    card.className = 'mission-card';
    card.style.opacity = '0.85'; // Visual cue for archived
    
    const assignees = getMissionAssigneesNames(mission.Referents_Assignes);
    const startDate = mission.date_debut ? new Date(mission.date_debut) : null;
    const endDate = mission.date_fin ? new Date(mission.date_fin) : null;
    let displayDate = 'Date inconnue';
    
    if (startDate) {
      const dayStr = startDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const startTime = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (endDate) {
        const endTime = endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        displayDate = `${dayStr} ${startTime} - ${endTime}`;
      } else {
        displayDate = `${dayStr} ${startTime}`;
      }
    }
    
    let tasksHTML = mTasks.map(t => {
      const isChecked = t.est_terminee ? 'checked' : '';
      const completedClass = t.est_terminee ? 'completed' : '';
      const ref = referentsData.find(r => r.Id === t.referents_id);
      const taskRefName = ref ? ref.nom : null;
      
      return `
        <li class="task-item ${completedClass}">
          <label class="brutal-checkbox-container" style="pointer-events: none;">
            <input type="checkbox" class="task-checkbox" ${isChecked} disabled />
            <span class="checkmark"></span>
          </label>
          <div class="task-content">
            <div class="task-title">${t.titre}</div>
            ${taskRefName ? `<div class="task-assignee">📍 ${taskRefName}</div>` : ''}
          </div>
        </li>
      `;
    }).join('');

    card.innerHTML = `
      <div class="mission-header">
        <div class="mission-top-bar">
          <h2 class="mission-title">${mission.titre || 'Sans titre'}</h2>
          <div class="mission-actions">
            <button class="btn-icon mission-unarchive" data-id="${mission.Id}" title="Désarchiver la mission">🔄</button>
          </div>
        </div>
        <div class="mission-info-grid">
          <div class="info-item">
            <span class="info-label">📅 Date</span>
            <span class="info-value">${displayDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">👥 Équipe</span>
            <div class="info-value team-list">
              ${assignees.map(a => `<span class="team-badge">${a}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <ul class="task-list">
        ${tasksHTML || '<li><em style="color:#777">Aucune tâche...</em></li>'}
      </ul>
    `;
    
    container.appendChild(card);
  });

  // Attach Unarchive Event
  document.querySelectorAll('.mission-unarchive').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const missionId = e.target.closest('.mission-unarchive').dataset.id;
      if (!confirm("Renvoyer cette mission vers le dashboard principal ?")) return;
      
      const success = await updateMission(missionId, { est_archivee: false });
      if (success) {
        missionsData = missionsData.filter(m => m.Id != missionId);
        tachesData = tachesData.filter(t => t.missions_id != missionId);
        renderArchive();
      } else {
        alert("Erreur lors du désarchivage");
      }
    });
  });
}
