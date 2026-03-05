import { fetchMissions, fetchTaches, fetchReferents, updateTache, updateMission, createTache, deleteTache, createMission, deleteMission, linkReferentToMission, unlinkReferentFromMission, createReferent, deleteReferent } from './api.js';

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
const inputMissionTimeDebut = document.getElementById('new-mission-time-debut');
const inputMissionTimeFin = document.getElementById('new-mission-time-fin');
const btnSaveMission = document.getElementById('btn-save-mission');
const btnCancelMission = document.getElementById('btn-cancel-mission');
const missionModalTitle = document.getElementById('mission-modal-title');
const taskModalTitle = document.getElementById('task-modal-title');

let editingMissionId = null;
let editingTaskId = null;

const assignMissionModal = document.getElementById('assign-mission-modal');
const assignMissionList = document.getElementById('assign-mission-list');
const inputAssignMissionId = document.getElementById('assign-mission-id');
const btnCloseAssignMission = document.getElementById('btn-close-assign-mission');
const inputNewReferentName = document.getElementById('new-referent-name');
const btnAddReferent = document.getElementById('btn-add-referent');

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
      editingMissionId = null;
      missionModalTitle.textContent = "Nouvelle Mission";
      btnSaveMission.textContent = "Ajouter";
      inputMissionTitle.value = '';
      inputMissionDate.value = '';
      inputMissionTimeDebut.value = '';
      inputMissionTimeFin.value = '';
      addMissionModal.classList.remove('hidden');
      inputMissionTitle.focus();
    });
    btnCancelMission.addEventListener('click', () => addMissionModal.classList.add('hidden'));
    btnSaveMission.addEventListener('click', handleCreateMission);

    btnCloseAssignMission.addEventListener('click', () => assignMissionModal.classList.add('hidden'));

    btnAddReferent.addEventListener('click', handleAddReferent);

  } catch (err) {
    container.innerHTML = '<p style="color:red; font-size:1.5rem; border:4px solid black; padding:1rem; background:white;">Erreur de connexion API.</p>';
    console.error(err);
  }
}

function populateReferentFilter() {
  // Clear current options first (except the first one)
  while (filterReferent.options.length > 1) filterReferent.remove(1);
  while (inputTaskReferentId.options.length > 1) inputTaskReferentId.remove(1);

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
  if (!Array.isArray(referentIds) || referentIds.length === 0) return null;
  // Get first assignee
  const ref = referentsData.find(r => r.Id === referentIds[0].Id);
  return ref ? ref.nom : null;
}

function getMissionAssigneesNames(referentIds) {
  if (!Array.isArray(referentIds) || referentIds.length === 0) return ["Non assigné"];
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
      const missionRefs = mission.Referents_Assignes;
      if (Array.isArray(missionRefs) && missionRefs.find(r => r.Id == selectedRef)) {
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
    
    // Formatting date range
    const startDate = mission.date_debut ? new Date(mission.date_debut) : null;
    const endDate = mission.date_fin ? new Date(mission.date_fin) : null;

    let displayDate = 'Date inconnue';
    
    if (startDate) {
      const dayStr = startDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const startTime = startDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (endDate) {
        const endTime = endDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        displayDate = `${dayStr} ${startTime} - ${endTime}`;
      } else {
        displayDate = `${dayStr} ${startTime}`;
      }
    }
    
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
          <div class="task-actions">
            <button class="btn-icon task-edit" data-id="${t.Id}" title="Modifier la tâche">✏️</button>
            <button class="btn-icon task-delete" data-id="${t.Id}" title="Supprimer la tâche">🗑️</button>
          </div>
        </li>
      `;
    }).join('');

    card.innerHTML = `
      <div class="mission-header">
        <div class="mission-top-bar">
          <h2 class="mission-title" contenteditable="true" spellcheck="false" data-id="${mission.Id}" style="outline: none;">${mission.titre || 'Sans titre'}</h2>
          <div class="mission-actions">
            <button class="btn-icon mission-edit" data-id="${mission.Id}" title="Modifier la mission">✏️</button>
            <button class="btn-icon mission-delete" data-id="${mission.Id}" title="Supprimer la mission">🗑️</button>
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
              <button class="btn-manage-team edit-mission-assignees" data-id="${mission.Id}">Modifier</button>
            </div>
          </div>
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
      editingTaskId = null;
      taskModalTitle.textContent = "Nouvelle Tâche";
      btnSaveTask.textContent = "Ajouter";
      openTaskModal(e.target.dataset.mission);
    });
  });

  // Attach Edit Task Event
  document.querySelectorAll('.task-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.target.closest('.task-edit').dataset.id;
      openEditTaskModal(taskId);
    });
  });

  // Attach Edit Mission Event
  document.querySelectorAll('.mission-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const missionId = e.target.closest('.mission-edit').dataset.id;
      openEditMissionModal(missionId);
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

function openTaskModal(missionId) {
  inputMissionId.value = missionId;
  inputTaskTitle.value = '';
  inputTaskReferentId.value = '';
  modal.classList.remove('hidden');
  inputTaskTitle.focus();
}

function openEditTaskModal(taskId) {
  const task = tachesData.find(t => t.Id == taskId);
  if (!task) return;
  
  editingTaskId = taskId;
  taskModalTitle.textContent = "Modifier la Tâche";
  btnSaveTask.textContent = "Enregistrer";
  
  inputMissionId.value = task.missions_id;
  inputTaskTitle.value = task.titre;
  inputTaskReferentId.value = task.referents_id || '';
  
  modal.classList.remove('hidden');
  inputTaskTitle.focus();
}

function openEditMissionModal(missionId) {
  const mission = missionsData.find(m => m.Id == missionId);
  if (!mission) return;

  editingMissionId = missionId;
  missionModalTitle.textContent = "Modifier la Mission";
  btnSaveMission.textContent = "Enregistrer";

  inputMissionTitle.value = mission.titre || '';
  
  if (mission.date_debut) {
    const d = new Date(mission.date_debut);
    inputMissionDate.value = d.toISOString().split('T')[0];
    inputMissionTimeDebut.value = d.toTimeString().slice(0, 5);
  } else {
    inputMissionDate.value = '';
    inputMissionTimeDebut.value = '';
  }

  if (mission.date_fin) {
    const d = new Date(mission.date_fin);
    inputMissionTimeFin.value = d.toTimeString().slice(0, 5);
  } else {
    inputMissionTimeFin.value = '';
  }

  addMissionModal.classList.remove('hidden');
  inputMissionTitle.focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

async function handleCreateTask() {
  const missionId = parseInt(inputMissionId.value);
  const titre = inputTaskTitle.value.trim();
  const referentId = inputTaskReferentId.value || null;
  
  if (!titre) return;
  
  const isEditing = editingTaskId !== null;
  btnSaveTask.textContent = isEditing ? "Enregistrement..." : "Création...";
  btnSaveTask.disabled = true;
  
  if (isEditing) {
    const success = await updateTache(editingTaskId, { 
      titre, 
      referents_id: referentId ? parseInt(referentId) : null 
    });
    if (success) {
      const t = tachesData.find(x => x.Id == editingTaskId);
      if (t) {
        t.titre = titre;
        t.referents_id = referentId ? parseInt(referentId) : null;
      }
      renderDashboard();
      closeModal();
    } else {
      alert("Erreur lors de la modification");
    }
  } else {
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
  }
  
  btnSaveTask.textContent = isEditing ? "Enregistrer" : "Ajouter";
  btnSaveTask.disabled = false;
}

async function handleCreateMission() {
  const titre = inputMissionTitle.value.trim();
  const devDate = inputMissionDate.value;
  const devTimeDebut = inputMissionTimeDebut.value;
  const devTimeFin = inputMissionTimeFin.value;
  
  if (!titre) return;
  
  const isEditing = editingMissionId !== null;
  btnSaveMission.textContent = isEditing ? "Enregistrement..." : "Création...";
  btnSaveMission.disabled = true;
  
  let dateDebutISO = null;
  let dateFinISO = null;

  if (devDate && devTimeDebut) {
    dateDebutISO = `${devDate}T${devTimeDebut}:00`;
  }
  if (devDate && devTimeFin) {
    dateFinISO = `${devDate}T${devTimeFin}:00`;
  }

  if (isEditing) {
    const success = await updateMission(editingMissionId, {
      titre,
      date_debut: dateDebutISO,
      date_fin: dateFinISO
    });
    if (success) {
      const m = missionsData.find(x => x.Id == editingMissionId);
      if (m) {
        m.titre = titre;
        m.date_debut = dateDebutISO;
        m.date_fin = dateFinISO;
      }
      renderDashboard();
      addMissionModal.classList.add('hidden');
    } else {
      alert("Erreur lors de la modification");
    }
  } else {
    const newMission = await createMission(titre, dateDebutISO, dateFinISO);
    if(newMission) {
      // Manual augmentation because API might return only Id
      newMission.titre = titre;
      newMission.date_debut = dateDebutISO;
      newMission.date_fin = dateFinISO;
      
      missionsData.push(newMission);
      renderDashboard();
      addMissionModal.classList.add('hidden');
    } else {
      alert("Erreur réseau");
    }
  }
  btnSaveMission.textContent = "Ajouter";
  btnSaveMission.disabled = false;
}

async function handleAddReferent() {
  const nom = inputNewReferentName.value.trim();
  if (!nom) return;

  btnAddReferent.disabled = true;
  btnAddReferent.textContent = "...";

  const newRef = await createReferent(nom);
  if (newRef) {
    referentsData.push(newRef);
    inputNewReferentName.value = '';
    populateReferentFilter();
    // Refresh the list in the currently open modal
    openAssignMissionModal(inputAssignMissionId.value);
  } else {
    alert("Erreur lors de la création du référent");
  }

  btnAddReferent.disabled = false;
  btnAddReferent.textContent = "Ajouter";
}

function openAssignMissionModal(missionId) {
  inputAssignMissionId.value = missionId;
  const mission = missionsData.find(m => m.Id == missionId);
  if (!mission) return;
  
  const assignedIds = Array.isArray(mission.Referents_Assignes) ? mission.Referents_Assignes.map(r => r.Id) : [];
  
  assignMissionList.innerHTML = '';
  
  referentsData.forEach(ref => {
    const isAssigned = assignedIds.includes(ref.Id);
    const div = document.createElement('div');
    div.style.marginBottom = '0.5rem';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.innerHTML = `
      <label class="brutal-checkbox-container" style="font-size: 1.1rem; flex: 1;">
        <input type="checkbox" class="assignee-checkbox" value="${ref.Id}" ${isAssigned ? 'checked' : ''}>
        <span class="checkmark" style="height:20px; width:20px;"></span>
        <span style="margin-left: 0.5rem;">${ref.nom}</span>
      </label>
      <button class="btn-icon delete-referent" data-id="${ref.Id}" title="Supprimer ce référent" style="margin-left: 0.5rem; opacity: 0.6; padding: 0.2rem;">🗑️</button>
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

    const btnDel = div.querySelector('.delete-referent');
    btnDel.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Supprimer définitivement le référent "${ref.nom}" ?`)) return;
      
      progressCounter.innerText = 'Suppression...';
      const success = await deleteReferent(ref.Id);
      if (success) {
        referentsData = referentsData.filter(r => r.Id != ref.Id);
        // Clean up assignment if it was assigned to this mission
        if (Array.isArray(mission.Referents_Assignes)) {
          mission.Referents_Assignes = mission.Referents_Assignes.filter(r => r.Id != ref.Id);
        }
        populateReferentFilter();
        renderDashboard();
        openAssignMissionModal(missionId);
      } else {
        alert("Erreur lors de la suppression");
      }
    });

    assignMissionList.appendChild(div);
  });
  
  assignMissionModal.classList.remove('hidden');
}
