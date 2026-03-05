import { fetchMissions, fetchTaches, fetchReferents, updateTache, updateMission, createTache, deleteTache, createMission, deleteMission, linkReferentToMission, unlinkReferentFromMission } from './api.js';

let missionsData = [];
let tachesData = [];
let referentsData = [];

// DOM Elements
const container = document.getElementById('missions-container');
const progressCounter = document.getElementById('progress-counter');
const filterReferent = document.getElementById('filter-referent');
const filterStatus = document.getElementById('filter-status');

const modal = document.getElementById('add-task-modal');
const inputTaskTitle = document.getElementById('new-task-title');
const inputTaskReferentId = document.getElementById('new-task-referent-id');
const inputMissionId = document.getElementById('new-task-mission-id');
const btnSaveTask = document.getElementById('btn-save-task');
const btnCancelTask = document.getElementById('btn-cancel-task');

const btnOpenAddMission = document.getElementById('btn-open-add-mission');
const addMissionModal = document.getElementById('add-mission-modal');
const inputMissionTitle = document.getElementById('new-mission-title');
const inputMissionDate = document.getElementById('new-mission-date');
const btnSaveMission = document.getElementById('btn-save-mission');
const btnCancelMission = document.getElementById('btn-cancel-mission');

const assignMissionModal = document.getElementById('assign-mission-modal');
const assignMissionList = document.getElementById('assign-mission-list');
const inputAssignMissionId = document.getElementById('assign-mission-id');
const btnCloseAssignMission = document.getElementById('btn-close-assign-mission');

export async function initDashboard() {
  container.innerHTML = '<p style="font-size: 1.5rem; font-weight: bold; animation: blink 1s infinite alternate;">Chargement brutal...</p>';
  try {
    // 1. Fetch data
    [missionsData, referentsData] = await Promise.all([
      fetchMissions(),
      fetchReferents()
    ]);

    // 2. Fetch tasks for all missions (can be optimized but simple for now)
    const taskPromises = missionsData.map(m => fetchTaches(m.Id));
    const tasksResults = await Promise.all(taskPromises);
    tachesData = tasksResults.flat();

    // 3. Populate Referees Filter
    populateReferentFilter();

    // 4. Render
    renderDashboard();

    // 5. Attach Filter Events
    filterReferent.addEventListener('change', renderDashboard);
    filterStatus.addEventListener('change', renderDashboard);
    
    // 6. Attach Modal Events
    btnCancelTask.addEventListener('click', closeModal);
    btnSaveTask.addEventListener('click', handleCreateTask);

    btnOpenAddMission.addEventListener('click', () => {
      inputMissionTitle.value = '';
      inputMissionDate.value = '';
      addMissionModal.classList.remove('hidden');
      inputMissionTitle.focus();
    });
    btnCancelMission.addEventListener('click', () => addMissionModal.classList.add('hidden'));
    btnSaveMission.addEventListener('click', handleCreateMission);

    btnCloseAssignMission.addEventListener('click', () => assignMissionModal.classList.add('hidden'));

  } catch (err) {
    container.innerHTML = '<p style="color:red; font-size:1.5rem; border:4px solid black; padding:1rem; background:white;">Erreur de connexion API.</p>';
    console.error(err);
  }
}

function populateReferentFilter() {
  referentsData.forEach(ref => {
    const opt = document.createElement('option');
    opt.value = ref.Id;
    opt.textContent = ref.nom;
    filterReferent.appendChild(opt);

    const optTask = document.createElement('option');
    optTask.value = ref.Id;
    optTask.textContent = ref.nom;
    inputTaskReferentId.appendChild(optTask);
  });
}

function getTaskAssigneeName(referentIds) {
  if (!referentIds || referentIds.length === 0) return null;
  // Get first assignee
  const ref = referentsData.find(r => r.Id === referentIds[0].Id);
  return ref ? ref.nom : null;
}

function getMissionAssigneesNames(referentIds) {
  if (!referentIds || referentIds.length === 0) return ["Non assigné"];
  return referentIds.map(idObj => {
    const ref = referentsData.find(r => r.Id === idObj.Id);
    return ref ? ref.nom : "Inconnu";
  });
}

function renderDashboard() {
  const selectedRef = filterReferent.value;
  const selectedStatus = filterStatus.value;
  
  let totalTasks = 0;
  let completedTasks = 0;
  
  container.innerHTML = '';
  
  missionsData.forEach(mission => {
    // Get tasks for this mission
    let mTasks = tachesData.filter(t => t.missions_id === mission.Id);
    
    // Apply Status Filter to Tasks
    if (selectedStatus === 'COMPLETED') {
      mTasks = mTasks.filter(t => t.est_terminee === true);
    } else if (selectedStatus === 'INCOMPLETE') {
      mTasks = mTasks.filter(t => t.est_terminee !== true);
    }
    
    // Apply Referee Filter to Mission OR Tasks
    // A mission is shown if it matches the referee itself, OR if any of its tasks matches the referee
    // For simplicity, if a filter is active, we only show tasks assigned to this referee
    let missionMatchesRef = false;
    if (selectedRef === 'ALL') {
      missionMatchesRef = true;
    } else {
      // Check if mission has the referee
      const missionRefs = mission.Referents_Assignes || [];
      if (missionRefs.find(r => r.Id == selectedRef)) {
        missionMatchesRef = true;
      }
      
      // Filter tasks to only those assigned to the selected ref (or if mission is assigned to the ref, show all tasks? Let's show all tasks if mission matches, otherwise filter tasks)
      if (!missionMatchesRef) {
        mTasks = mTasks.filter(t => t.referents_id == selectedRef);
        if (mTasks.length > 0) missionMatchesRef = true;
      }
    }
    
    if (!missionMatchesRef) return; // Skip mission

    // Count statistics for the counter
    const allMissionTasks = tachesData.filter(t => t.missions_id === mission.Id);
    totalTasks += allMissionTasks.length;
    completedTasks += allMissionTasks.filter(t => t.est_terminee === true).length;
    
    // Render Mission Card
    const card = document.createElement('div');
    card.className = 'mission-card';
    
    const assignees = getMissionAssigneesNames(mission.Referents_Assignes);
    const dateStr = mission.date_debut ? new Date(mission.date_debut).toLocaleString('fr-FR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}) : 'Date inconnue';
    
    let tasksHTML = mTasks.map(t => {
      const isChecked = t.est_terminee ? 'checked' : '';
      const completedClass = t.est_terminee ? 'completed' : '';
      
      // Get assigneee using the new foreign key
      const ref = referentsData.find(r => r.Id === t.referents_id);
      const taskRefName = ref ? ref.nom : null;
      
      return `
        <li class="task-item ${completedClass}" data-id="${t.Id}">
          <label class="brutal-checkbox-container">
            <input type="checkbox" class="task-checkbox" ${isChecked} autocomplete="off" />
            <span class="checkmark"></span>
          </label>
          <div class="task-content">
            <div class="task-title" contenteditable="true" spellcheck="false" data-id="${t.Id}" style="outline: none;">${t.titre}</div>
            ${taskRefName ? `<div class="task-assignee">📍 ${taskRefName}</div>` : ''}
          </div>
          <button class="btn-delete task-delete" data-id="${t.Id}" title="Supprimer la tâche">🗑️</button>
        </li>
      `;
    }).join('');

    card.innerHTML = `
      <div class="mission-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h2 class="mission-title" contenteditable="true" spellcheck="false" data-id="${mission.Id}" style="outline: none; flex: 1;">${mission.titre}</h2>
          <button class="btn-delete mission-delete" data-id="${mission.Id}" title="Supprimer la mission">🗑️</button>
        </div>
        <div class="mission-meta" style="margin-top: 0.5rem;">
          <span class="brutal-tag">${dateStr}</span>
          ${assignees.map(a => `<span class="brutal-tag" style="background:#fff">${a}</span>`).join('')}
          <button class="btn-action edit-mission-assignees" data-id="${mission.Id}">Gérer l'équipe</button>
        </div>
      </div>
      <ul class="task-list">
        ${tasksHTML || '<li><em style="color:#777">Aucune tâche visible...</em></li>'}
      </ul>
      <button class="btn-add-task" data-mission="${mission.Id}">+ Ajouter une tâche</button>
    `;
    
    container.appendChild(card);
  });
  
  // Update Global Counter
  progressCounter.innerText = `${completedTasks} / ${totalTasks} Terminées`;
  
  // Attach Task Checkbox Events
  document.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const taskItem = e.target.closest('.task-item');
      const taskId = taskItem.dataset.id;
      const newVal = e.target.checked;
      
      // Optimistic UI Update
      if (newVal) taskItem.classList.add('completed');
      else taskItem.classList.remove('completed');
      
      // Update local data
      const t = tachesData.find(x => x.Id == taskId);
      if (t) t.est_terminee = newVal;
      
      progressCounter.innerText = 'Sauvegarde...';
      
      // API call
      await updateTache(taskId, { est_terminee: newVal });
      
      // Re-render (to update counter properly if it didn't match local data, etc.)
      renderDashboard();
    });
  });

  // Editable titles logic
  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
  });

  document.querySelectorAll('.task-title').forEach(el => {
    el.addEventListener('blur', async (e) => {
      const taskId = e.target.dataset.id;
      const newTitle = e.target.innerText.trim();
      const t = tachesData.find(x => x.Id == taskId);
      if (t && t.titre !== newTitle && newTitle !== '') {
        t.titre = newTitle;
        progressCounter.innerText = 'Sauvegarde...';
        await updateTache(taskId, { titre: newTitle });
        renderDashboard();
      } else if (newTitle === '') {
        e.target.innerText = t.titre;
      }
    });
  });

  document.querySelectorAll('.mission-title').forEach(el => {
    el.addEventListener('blur', async (e) => {
      const missionId = e.target.dataset.id;
      const newTitle = e.target.innerText.trim();
      const m = missionsData.find(x => x.Id == missionId);
      if (m && m.titre !== newTitle && newTitle !== '') {
        m.titre = newTitle;
        progressCounter.innerText = 'Sauvegarde...';
        await updateMission(missionId, { titre: newTitle });
        renderDashboard();
      } else if (newTitle === '') {
        e.target.innerText = m.titre;
      }
    });
  });

  // Attach Add Modals
  document.querySelectorAll('.btn-add-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openModal(e.target.dataset.mission);
    });
  });

  // Attach Delete Task Event
  document.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm("Supprimer cette tâche ?")) return;
      const taskId = e.target.closest('.task-delete').dataset.id;
      progressCounter.innerText = 'Suppression...';
      const success = await deleteTache(taskId);
      if(success) {
        tachesData = tachesData.filter(t => t.Id != taskId);
        renderDashboard();
      } else {
        alert("Erreur");
        progressCounter.innerText = 'Erreur';
      }
    });
  });

  // Attach Delete Mission Event
  document.querySelectorAll('.mission-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm("Supprimer cette mission et toutes ses tâches ?")) return;
      const missionId = e.target.closest('.mission-delete').dataset.id;
      progressCounter.innerText = 'Suppression...';
      const success = await deleteMission(missionId);
      if(success) {
        missionsData = missionsData.filter(m => m.Id != missionId);
        tachesData = tachesData.filter(t => t.missions_id != missionId);
        renderDashboard();
      } else {
        alert("Erreur");
        progressCounter.innerText = 'Erreur';
      }
    });
  });

  // Attach Manage Team Event
  document.querySelectorAll('.edit-mission-assignees').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openAssignMissionModal(e.target.dataset.id);
    });
  });
}

function openModal(missionId) {
  inputMissionId.value = missionId;
  inputTaskTitle.value = '';
  modal.classList.remove('hidden');
  inputTaskTitle.focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

async function handleCreateTask() {
  const missionId = parseInt(inputMissionId.value);
  const titre = inputTaskTitle.value.trim();
  const referentId = inputTaskReferentId.value || null;
  
  if (!titre) return;
  
  btnSaveTask.textContent = "Création...";
  btnSaveTask.disabled = true;
  
  const newTask = await createTache(missionId, titre, referentId);
  
  if (newTask) {
    newTask.missions_id = missionId;
    if (referentId) {
      newTask.referents_id = parseInt(referentId);
    }
    
    tachesData.push(newTask);
    renderDashboard();
    closeModal();
  } else {
    alert("Erreur réseau");
  }
  
  btnSaveTask.textContent = "Ajouter";
  btnSaveTask.disabled = false;
}

async function handleCreateMission() {
  const titre = inputMissionTitle.value.trim();
  const devDate = inputMissionDate.value;
  
  if (!titre) return;
  
  btnSaveMission.textContent = "Création...";
  btnSaveMission.disabled = true;
  
  let formattedDate = null;
  if(devDate) {
    formattedDate = devDate;
  }
  
  const newMission = await createMission(titre, formattedDate);
  if(newMission) {
    missionsData.push(newMission);
    renderDashboard();
    addMissionModal.classList.add('hidden');
  } else {
    alert("Erreur réseau");
  }
  btnSaveMission.textContent = "Ajouter";
  btnSaveMission.disabled = false;
}

function openAssignMissionModal(missionId) {
  inputAssignMissionId.value = missionId;
  const mission = missionsData.find(m => m.Id == missionId);
  const assignedIds = mission.Referents_Assignes ? mission.Referents_Assignes.map(r => r.Id) : [];
  
  assignMissionList.innerHTML = '';
  
  referentsData.forEach(ref => {
    const isAssigned = assignedIds.includes(ref.Id);
    const div = document.createElement('div');
    div.style.marginBottom = '0.5rem';
    div.innerHTML = `
      <label class="brutal-checkbox-container" style="font-size: 1.1rem;">
        <input type="checkbox" class="assignee-checkbox" value="${ref.Id}" ${isAssigned ? 'checked' : ''}>
        <span class="checkmark" style="height:20px; width:20px;"></span>
        <span style="margin-left: 0.5rem;">${ref.nom}</span>
      </label>
    `;
    const cb = div.querySelector('input');
    cb.addEventListener('change', async (e) => {
      progressCounter.innerText = 'Mise à jour...';
      const refId = parseInt(e.target.value);
      if(e.target.checked) {
        const success = await linkReferentToMission(missionId, refId);
        if(success) {
           if(!mission.Referents_Assignes) mission.Referents_Assignes = [];
           mission.Referents_Assignes.push({Id: refId});
        }
      } else {
        const success = await unlinkReferentFromMission(missionId, refId);
        if(success && mission.Referents_Assignes) {
           mission.Referents_Assignes = mission.Referents_Assignes.filter(r => r.Id != refId);
        }
      }
      renderDashboard(); // Re-render to update badges
    });
    assignMissionList.appendChild(div);
  });
  
  assignMissionModal.classList.remove('hidden');
}
