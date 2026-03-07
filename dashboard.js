import {
  fetchMissions,
  fetchTaches,
  fetchReferents,
  updateTache,
  updateMission,
  createTache,
  deleteTache,
  createMission,
  deleteMission,
  linkReferentToMission,
  unlinkReferentFromMission,
  createReferent,
  deleteReferent,
  updateReferent,
  fetchMissionReferents,
  bulkUpdateTaches,
} from "./api.js";

let missionsData = [];
let tachesData = [];
let referentsData = [];

// DOM Elements
const container = document.getElementById("missions-container");
const progressCounter = document.getElementById("progress-counter");
const filterReferent = document.getElementById("filter-referent");
const filterStatus = document.getElementById("filter-status");
const filterPhase = document.getElementById("filter-phase");

const modal = document.getElementById("add-task-modal");
const inputTaskTitle = document.getElementById("new-task-title");
const inputTaskReferentId = document.getElementById("new-task-referent-id");
const inputMissionId = document.getElementById("new-task-mission-id");
const btnSaveTask = document.getElementById("btn-save-task");
const btnCancelTask = document.getElementById("btn-cancel-task");

const btnOpenAddMission = document.getElementById("btn-open-add-mission");
const addMissionModal = document.getElementById("add-mission-modal");
const inputMissionTitle = document.getElementById("new-mission-title");
const inputMissionDate = document.getElementById("new-mission-date");
const inputMissionTimeDebut = document.getElementById("new-mission-time-debut");
const inputMissionTimeFin = document.getElementById("new-mission-time-fin");
const btnSaveMission = document.getElementById("btn-save-mission");
const btnCancelMission = document.getElementById("btn-cancel-mission");
const missionModalTitle = document.getElementById("mission-modal-title");
const taskModalTitle = document.getElementById("task-modal-title");

const timeInputsContainer = document.getElementById("time-inputs-container");
const lblMissionDate = document.getElementById("lbl-mission-date");

const ficheModal = document.getElementById("fiche-task-modal");
const inputFicheContent = document.getElementById("task-fiche-content");
const inputFicheTaskId = document.getElementById("fiche-task-id");
const btnCancelFiche = document.getElementById("btn-cancel-fiche");

const editMissionFicheModal = document.getElementById("edit-mission-fiche-modal");
const inputEditMissionFicheId = document.getElementById("edit-mission-fiche-id");
const btnSaveMissionFiche = document.getElementById("btn-save-mission-fiche");
const btnCancelMissionFiche = document.getElementById("btn-cancel-mission-fiche");
let missionFicheQuill = null;

let editingMissionId = null;
let editingTaskId = null;

const assignMissionModal = document.getElementById("assign-mission-modal");
const assignMissionList = document.getElementById("assign-mission-list");
const inputAssignMissionId = document.getElementById("assign-mission-id");
const btnCloseAssignMission = document.getElementById(
  "btn-close-assign-mission",
);
const inputNewReferentName = document.getElementById("new-referent-name");
const btnAddReferent = document.getElementById("btn-add-referent");

const missionPhaseSelect = document.getElementById("mission-phase-select");
const newPhaseInput = document.getElementById("new-phase-input");
const btnToggleNewPhase = document.getElementById("btn-toggle-new-phase");

export async function initDashboard() {
  container.innerHTML =
    '<p style="font-size: 1.5rem; font-weight: bold; animation: blink 1s infinite alternate;">Chargement brutal...</p>';
  try {
    // 1. Fetch data
    [missionsData, referentsData] = await Promise.all([
      fetchMissions(),
      fetchReferents(),
    ]);

    // Trier les référents par ordre alphabétique
    if (referentsData) {
      referentsData.sort((a, b) =>
        a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }),
      );
    }

    // 2. Fetch tasks for all missions (can be optimized but simple for now)
    const taskPromises = missionsData.map((m) => fetchTaches(m.Id));
    const tasksResults = await Promise.all(taskPromises);
    tachesData = tasksResults.flat();

    // 3. Fetch referents implicitly linked to each mission (NocoDB v2 workaround)
    const missionRefPromises = missionsData.map(async (m) => {
      // Fetch explicit relationships
      const linkedRefs = await fetchMissionReferents(m.Id);
      // Replace the integer count with the actual array of IDs/Objects
      m.Referents_Assignes = linkedRefs || [];
      return linkedRefs;
    });
    await Promise.all(missionRefPromises);

    // 4. Populate Referees & Phase Filters
    populateReferentFilter();
    populatePhaseFilter();

    // 5. Render
    console.log("Debug Missions Data:", missionsData);
    console.log("Debug Referents Data:", referentsData);
    renderDashboard();

    // 5. Attach Filter Events
    filterReferent.addEventListener("change", renderDashboard);
    filterStatus.addEventListener("change", renderDashboard);
    filterPhase.addEventListener("change", renderDashboard);

    // Initialisation Quill JS
    if (typeof Quill !== "undefined" && !missionFicheQuill) {
      missionFicheQuill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
          ]
        }
      });
    }

    // 6. Attach Modal Events
    btnCancelTask.addEventListener("click", closeModal);
    btnSaveTask.addEventListener("click", handleCreateTask);

    btnCancelFiche.addEventListener("click", () =>
      ficheModal.classList.add("hidden"),
    );

    btnCancelMissionFiche.addEventListener("click", () =>
      editMissionFicheModal.classList.add("hidden"),
    );
    btnSaveMissionFiche.addEventListener("click", handleSaveMissionFiche);

    btnOpenAddMission.addEventListener("click", () => {
      editingMissionId = null;
      missionModalTitle.textContent = "Nouvelle Mission";
      btnSaveMission.textContent = "Ajouter";
      inputMissionTitle.value = "";
      inputMissionDate.value = "";
      inputMissionTimeDebut.value = "";
      inputMissionTimeFin.value = "";
      
      // Reset radio buttons to 'taches'
      const radioTaches = document.querySelector('input[name="mission-type"][value="taches"]');
      if (radioTaches) radioTaches.checked = true;
      timeInputsContainer.style.display = "flex";
      lblMissionDate.textContent = "Date";

      addMissionModal.classList.remove("hidden");
      inputMissionTitle.focus();
    });

    document.querySelectorAll('input[name="mission-type"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.value === "fiche") {
          timeInputsContainer.style.display = "none";
          lblMissionDate.textContent = "Date d'échéance";
          inputMissionTimeDebut.value = "";
          inputMissionTimeFin.value = "";
        } else {
          timeInputsContainer.style.display = "flex";
          lblMissionDate.textContent = "Date";
        }
      });
    });

    btnCancelMission.addEventListener("click", () =>
      addMissionModal.classList.add("hidden"),
    );
    btnSaveMission.addEventListener("click", handleCreateMission);

    btnToggleNewPhase.addEventListener("click", () => {
      if (newPhaseInput.style.display === "none") {
        newPhaseInput.style.display = "block";
        missionPhaseSelect.style.display = "none";
        btnToggleNewPhase.textContent = "-";
      } else {
        newPhaseInput.style.display = "none";
        missionPhaseSelect.style.display = "block";
        btnToggleNewPhase.textContent = "+";
        newPhaseInput.value = "";
      }
    });

    btnCloseAssignMission.addEventListener("click", () =>
      assignMissionModal.classList.add("hidden"),
    );

    btnAddReferent.addEventListener("click", handleAddReferent);
  } catch (err) {
    container.innerHTML =
      '<p style="color:red; font-size:1.5rem; border:4px solid black; padding:1rem; background:white;">Erreur de connexion API.</p>';
  }
}

function populateReferentFilter() {
  // Clear current options first (except the first one)
  while (filterReferent.options.length > 1) filterReferent.remove(1);
  while (inputTaskReferentId.options.length > 1) inputTaskReferentId.remove(1);

  referentsData.forEach((ref) => {
    const opt = document.createElement("option");
    opt.value = ref.Id;
    opt.textContent = ref.nom;
    filterReferent.appendChild(opt);

    const optTask = document.createElement("option");
    optTask.value = ref.Id;
    optTask.textContent = ref.nom;
    inputTaskReferentId.appendChild(optTask);
  });
}

function populatePhaseFilter() {
  // Clear current options first (except default)
  while (filterPhase.options.length > 1) filterPhase.remove(1);
  
  // Clear modal select options too (except default)
  while (missionPhaseSelect.options.length > 1) missionPhaseSelect.remove(1);

  // Extract unique phases from missionsData
  const uniquePhases = [
    ...new Set(missionsData.map((m) => m.phase).filter((p) => p && p.trim() !== "")),
  ].sort();

  uniquePhases.forEach((phase) => {
    // Add to dashboard filter
    const opt = document.createElement("option");
    opt.value = phase;
    opt.textContent = phase;
    filterPhase.appendChild(opt);

    // Add to mission modal select
    const optModal = document.createElement("option");
    optModal.value = phase;
    optModal.textContent = phase;
    missionPhaseSelect.appendChild(optModal);
  });
}

function getTaskAssigneeName(referentIds) {
  if (!Array.isArray(referentIds) || referentIds.length === 0) return null;
  // Get first assignee
  const ref = referentsData.find((r) => r.Id == referentIds[0].Id);
  return ref ? ref.nom : null;
}

function getMissionAssigneesNames(referentIds) {
  // Debug si besoin
  // console.log("getMissionAssigneesNames input:", referentIds);

  if (!Array.isArray(referentIds)) {
    return ["Non assigné"];
  }
  if (referentIds.length === 0) return ["Non assigné"];

  const names = referentIds.map((ptr) => {
    // Si c'est juste un ID (String ou Number)
    if (typeof ptr !== "object") {
      const ref = referentsData.find((r) => r.Id == ptr || r.id == ptr);
      return ref ? ref.nom : "Inconnu (" + ptr + ")";
    }

    // Si c'est un objet (cas standard du nesting)
    const actualId = ptr.Id || ptr.id;

    // Si l'objet imbriqué a déjà le nom, on l'utilise
    if (ptr.nom) return ptr.nom;

    // Sinon on cherche dans referentsData chargé globalement
    const ref = referentsData.find((r) => r.Id == actualId || r.id == actualId);
    return ref ? ref.nom : actualId ? "Inconnu (" + actualId + ")" : "Inconnu";
  });

  return names.sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );
}

function renderDashboard() {
  const selectedRef = filterReferent.value;
  const selectedStatus = filterStatus.value;
  const selectedPhase = filterPhase.value;

  let totalTasks = 0;
  let completedTasks = 0;

  container.innerHTML = "";

  missionsData.forEach((mission) => {
    // Apply Phase Filter to Mission
    if (selectedPhase !== "ALL") {
      if (mission.phase !== selectedPhase) return;
    }

    // Get tasks for this mission
    const baseTasks = tachesData.filter((t) => t.missions_id === mission.Id);
    let relevantTasks = baseTasks; // Les tâches qui "appartiennent" logiquement à ce référent

    // Apply Referee Filter to Mission OR Tasks
    let missionMatchesRef = false;
    let isMissionReferent = false;

    if (selectedRef === "ALL") {
      missionMatchesRef = true;
      isMissionReferent = true;
    } else {
      // Check if mission has the referee
      const missionRefs = mission.Referents_Assignes;
      if (
        Array.isArray(missionRefs) &&
        missionRefs.find((r) => r.Id == selectedRef)
      ) {
        missionMatchesRef = true;
        isMissionReferent = true; // Mène à compter TOUTES les tâches
      }

      if (!missionMatchesRef) {
        // Le référent n'est assigné qu'à des tâches spécifiques, on ne compte que celles-ci
        relevantTasks = baseTasks.filter((t) => t.referents_id == selectedRef);
        if (relevantTasks.length > 0) {
          missionMatchesRef = true;
        }
      }
    }

    if (!missionMatchesRef) return; // Skip mission

    // Apply Status Filter to Tasks (seulement pour l'affichage)
    let mTasks = relevantTasks;
    if (selectedStatus === "COMPLETED") {
      mTasks = mTasks.filter((t) => t.est_terminee === true);
    } else if (selectedStatus === "INCOMPLETE") {
      mTasks = mTasks.filter((t) => t.est_terminee !== true);
    }

    // Si le référent n'est pas assigné à la mission, et que le filtre de statut masque toutes ses tâches,
    // on masque la mission (pour correspondre au comportement initial).
    if (!isMissionReferent && mTasks.length === 0) {
      return;
    }

    // Sort tasks by 'ordre'
    mTasks.sort((a, b) => {
      const orderA =
        a.ordre === null || a.ordre === undefined ? Infinity : a.ordre;
      const orderB =
        b.ordre === null || b.ordre === undefined ? Infinity : b.ordre;
      return orderA - orderB;
    });

    // Count statistics for the counter
    totalTasks += relevantTasks.length;
    completedTasks += relevantTasks.filter(
      (t) => t.est_terminee === true,
    ).length;

    // Render Mission Card
    const card = document.createElement("div");
    card.className = "mission-card";

    // Logic for dynamic background colors
    const isNoReferent = !mission.Referents_Assignes || mission.Referents_Assignes.length === 0;
    const isAllCompleted = baseTasks.length > 0 && baseTasks.every(t => t.est_terminee);

    if (isNoReferent) {
      card.classList.add("mission-no-referent");
    } else if (isAllCompleted) {
      card.classList.add("mission-all-completed");
    }

    const assignees = getMissionAssigneesNames(mission.Referents_Assignes);

    // Formatting date range
    const startDate = mission.date_debut ? new Date(mission.date_debut) : null;
    const endDate = mission.date_fin ? new Date(mission.date_fin) : null;

    let displayDate = "Date inconnue";
    let isFicheFormat = !!mission.fiche;

    if (startDate) {
      const dayStr = startDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const startTime = startDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isFicheFormat) {
          displayDate = `${dayStr}`;
      } else {
          if (endDate) {
            const endTime = endDate.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            displayDate = `${dayStr} ${startTime} - ${endTime}`;
          } else {
            displayDate = `${dayStr} ${startTime}`;
          }
      }
    }

    let tasksHTML = mTasks
      .map((t) => {
        const isChecked = t.est_terminee ? "checked" : "";
        const completedClass = t.est_terminee ? "completed" : "";

        // Get assigneee using the new foreign key
        const ref = referentsData.find((r) => r.Id == t.referents_id);
        const taskRefName = ref ? ref.nom : null;

        return `
        <li class="task-item ${completedClass}" data-id="${t.Id}">
          <label class="brutal-checkbox-container">
            <input type="checkbox" class="task-checkbox" ${isChecked} autocomplete="off" />
            <span class="checkmark"></span>
          </label>
          <div class="task-content">
            <div class="task-title" contenteditable="true" spellcheck="false" data-id="${t.Id}" style="outline: none;">${t.titre}</div>
            ${taskRefName ? `<div class="task-assignee">📍 ${taskRefName}</div>` : ""}
            ${t.fiche ? `<div style="margin-top: 0.3rem;"><button class="task-fiche" data-id="${t.Id}" title="Consulter la fiche" style="background-color: var(--color-ice); border: 2px solid var(--color-dark); color: var(--color-dark); font-weight: bold; font-size: 0.70rem; padding: 2px 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 2px 2px 0px var(--color-dark); text-transform: uppercase;">📄 Fiche</button></div>` : ""}
          </div>
          <div class="task-actions" style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn-icon task-edit" data-id="${t.Id}" title="Modifier la tâche">✏️</button>
            <button class="btn-icon task-delete" data-id="${t.Id}" title="Supprimer la tâche">🗑️</button>
          </div>
        </li>
      `;
      })
      .join("");

    card.innerHTML = `
      <div class="mission-header">
        <div class="mission-top-bar">
          <div style="display: flex; flex-direction: column; align-items: flex-start; flex: 1;">
            <h2 class="mission-title" contenteditable="true" spellcheck="false" data-id="${mission.Id}" style="outline: none; margin-bottom: 0;">${mission.titre || "Sans titre"}</h2>
            ${mission.phase ? `<span class="phase-badge">${mission.phase}</span>` : ""}
          </div>
          <div class="mission-actions">
            <button class="btn-icon mission-archive" data-id="${mission.Id}" title="Archiver la mission">📦</button>
            <button class="btn-icon mission-edit" data-id="${mission.Id}" title="Modifier la mission">✏️</button>
            <button class="btn-icon mission-delete" data-id="${mission.Id}" title="Supprimer la mission">🗑️</button>
          </div>
        </div>
        <div class="mission-info-grid">
          <div class="info-item">
            <span class="info-label">${isFicheFormat ? '⏳ Échéance' : '📅 Date'}</span>
            <span class="info-value">${displayDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">👥 Équipe</span>
            <div class="info-value team-list">
              ${assignees.map((a) => `<span class="team-badge">${a}</span>`).join("")}
              <button class="btn-manage-team edit-mission-assignees" data-id="${mission.Id}">Modifier</button>
            </div>
          </div>
        </div>
      </div>
      ${mission.fiche ? `
        <div class="mission-fiche-preview" style="margin-top: 1rem; padding: 1rem; background-color: var(--color-light); border: 2px solid var(--color-dark); font-size: 0.9rem;">
          ${mission.fiche}
        </div>
        <button class="btn-brutal mission-edit-fiche" data-id="${mission.Id}" style="margin-top: 0.5rem; width: 100%; background-color: var(--color-ice);">📝 Éditer la fiche</button>
      ` : `
        <ul class="task-list">
          ${tasksHTML || '<li><em style="color:#777">Aucune tâche visible...</em></li>'}
        </ul>
        <button class="btn-add-task" data-mission="${mission.Id}">+ Ajouter une tâche</button>
      `}
    `;

    container.appendChild(card);
  });

  // Update Global Counter
  progressCounter.innerText = `${completedTasks} / ${totalTasks} Terminées`;

  // Attach SortableJS to each task list
  document.querySelectorAll(".task-list").forEach((taskList) => {
    new Sortable(taskList, {
      animation: 150,
      delay: 300, // 300ms de clic long avant d'activer le drag-and-drop
      delayOnTouchOnly: true, // S'applique principalement sur mobile pour ne pas bloquer le scroll
      touchStartThreshold: 5, // Important pour mobile : tolérance de 5px pour les micro-mouvements
      fallbackTolerance: 3, // Important pour mobile : évite d'annuler le clic long si le doigt bouge très légèrement
      ghostClass: "sortable-ghost", // Classe style lors du déplacement
      onEnd: async function (evt) {
        if (evt.oldIndex === evt.newIndex) return; // Pas de déplacement

        const parentList = evt.to;
        const taskItems = Array.from(parentList.querySelectorAll(".task-item"));

        let updates = [];
        // On recupère le nouvel ordre du DOM
        taskItems.forEach((item, index) => {
          const taskId = item.dataset.id;
          const taskObj = tachesData.find((t) => t.Id == taskId);
          // Si l'ordre a changé localement (ou n'existait pas)
          if (taskObj && taskObj.ordre !== index) {
            taskObj.ordre = index;
            updates.push({ Id: taskId, ordre: index });
          }
        });

        if (updates.length > 0) {
          progressCounter.innerText = "Sauvegarde en cours...";
          const success = await bulkUpdateTaches(updates);
          if (success) {
            // Re-render pour s'assurer que l'état local correspond parfaitement
            renderDashboard();
          } else {
            progressCounter.innerText = "Erreur lors de la sauvegarde";
            alert("Erreur réseau lors du changement d'ordre.");
            renderDashboard(); // Revenir à l'ancien état
          }
        }
      },
    });
  });

  // Attach Task Checkbox Events
  document.querySelectorAll(".task-checkbox").forEach((cb) => {
    cb.addEventListener("change", async (e) => {
      const taskItem = e.target.closest(".task-item");
      const taskId = taskItem.dataset.id;
      const newVal = e.target.checked;

      // Optimistic UI Update
      if (newVal) taskItem.classList.add("completed");
      else taskItem.classList.remove("completed");

      // Update local data
      const t = tachesData.find((x) => x.Id == taskId);
      if (t) t.est_terminee = newVal;

      progressCounter.innerText = "Sauvegarde...";

      // API call
      await updateTache(taskId, { est_terminee: newVal });

      // Re-render (to update counter properly if it didn't match local data, etc.)
      renderDashboard();
    });
  });

  // Editable titles logic
  document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  });

  document.querySelectorAll(".task-title").forEach((el) => {
    el.addEventListener("blur", async (e) => {
      const taskId = e.target.dataset.id;
      const newTitle = e.target.innerText.trim();
      const t = tachesData.find((x) => x.Id == taskId);
      if (t && t.titre !== newTitle && newTitle !== "") {
        t.titre = newTitle;
        progressCounter.innerText = "Sauvegarde...";
        await updateTache(taskId, { titre: newTitle });
        renderDashboard();
      } else if (newTitle === "") {
        e.target.innerText = t.titre;
      }
    });
  });

  document.querySelectorAll(".mission-title").forEach((el) => {
    el.addEventListener("blur", async (e) => {
      const missionId = e.target.dataset.id;
      const newTitle = e.target.innerText.trim();
      const m = missionsData.find((x) => x.Id == missionId);
      if (m && m.titre !== newTitle && newTitle !== "") {
        m.titre = newTitle;
        progressCounter.innerText = "Sauvegarde...";
        await updateMission(missionId, { titre: newTitle });
        renderDashboard();
      } else if (newTitle === "") {
        e.target.innerText = m.titre;
      }
    });
  });

  // Attach Add Modals
  document.querySelectorAll(".btn-add-task").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      editingTaskId = null;
      taskModalTitle.textContent = "Nouvelle Tâche";
      btnSaveTask.textContent = "Ajouter";
      openTaskModal(e.target.dataset.mission);
    });
  });

  document.querySelectorAll(".mission-edit-fiche").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openEditMissionFicheModal(e.target.dataset.id);
    });
  });

  // Attach Fiche Task Event
  document.querySelectorAll(".task-fiche").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const taskId = e.target.closest(".task-fiche").dataset.id;
      openFicheModal(taskId);
    });
  });

  // Attach Edit Task Event
  document.querySelectorAll(".task-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const taskId = e.target.closest(".task-edit").dataset.id;
      openEditTaskModal(taskId);
    });
  });

  // Attach Edit Mission Event
  document.querySelectorAll(".mission-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const missionId = e.target.closest(".mission-edit").dataset.id;
      openEditMissionModal(missionId);
    });
  });

  // Attach Delete Task Event
  document.querySelectorAll(".task-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      if (!confirm("Supprimer cette tâche ?")) return;
      const taskId = e.target.closest(".task-delete").dataset.id;
      progressCounter.innerText = "Suppression...";
      const success = await deleteTache(taskId);
      if (success) {
        tachesData = tachesData.filter((t) => t.Id != taskId);
        renderDashboard();
      } else {
        alert("Erreur");
        progressCounter.innerText = "Erreur";
      }
    });
  });

  // Attach Delete Mission Event
  document.querySelectorAll(".mission-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      if (!confirm("Supprimer cette mission et toutes ses tâches ?")) return;
      const missionId = e.target.closest(".mission-delete").dataset.id;
      progressCounter.innerText = "Suppression...";
      const success = await deleteMission(missionId);
      if (success) {
        const idInt = parseInt(missionId);
        missionsData = missionsData.filter((m) => m.Id != idInt);
        tachesData = tachesData.filter((t) => t.missions_id != idInt);
        populatePhaseFilter();
        renderDashboard();
      } else {
        alert("Erreur");
        progressCounter.innerText = "Erreur";
      }
    });
  });

  // Attach Archive Mission Event
  document.querySelectorAll(".mission-archive").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      if (
        !confirm(
          "Archiver cette mission ? Elle n'apparaîtra plus sur cette page.",
        )
      )
        return;
      const missionId = e.target.closest(".mission-archive").dataset.id;
      progressCounter.innerText = "Archivage...";
      const success = await updateMission(missionId, { est_archivee: true });
      if (success) {
        missionsData = missionsData.filter((m) => m.Id != missionId);
        tachesData = tachesData.filter((t) => t.missions_id != missionId);
        populatePhaseFilter();
        renderDashboard();
      } else {
        alert("Erreur");
        progressCounter.innerText = "Erreur";
      }
    });
  });

  // Attach Manage Team Event
  document.querySelectorAll(".edit-mission-assignees").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openAssignMissionModal(e.target.dataset.id);
    });
  });
}

function openTaskModal(missionId) {
  inputMissionId.value = missionId;
  inputTaskTitle.value = "";
  inputTaskReferentId.value = "";
  modal.classList.remove("hidden");
  inputTaskTitle.focus();
}

function openEditTaskModal(taskId) {
  const task = tachesData.find((t) => t.Id == taskId);
  if (!task) return;

  editingTaskId = taskId;
  taskModalTitle.textContent = "Modifier la Tâche";
  btnSaveTask.textContent = "Enregistrer";

  inputMissionId.value = task.missions_id;
  inputTaskTitle.value = task.titre;
  inputTaskReferentId.value = task.referents_id || "";

  modal.classList.remove("hidden");
  inputTaskTitle.focus();
}

function openEditMissionModal(missionId) {
  const mission = missionsData.find((m) => m.Id == missionId);
  if (!mission) return;

  editingMissionId = missionId;
  missionModalTitle.textContent = "Modifier la Mission";
  btnSaveMission.textContent = "Enregistrer";

  inputMissionTitle.value = mission.titre || "";

  if (mission.date_debut) {
    const d = new Date(mission.date_debut);
    inputMissionDate.value = d.toISOString().split("T")[0];
    inputMissionTimeDebut.value = d.toTimeString().slice(0, 5);
  } else {
    inputMissionDate.value = "";
    inputMissionTimeDebut.value = "";
  }

  if (mission.date_fin) {
    const d = new Date(mission.date_fin);
    inputMissionTimeFin.value = d.toTimeString().slice(0, 5);
  } else {
    inputMissionTimeFin.value = "";
  }

  // Set radio based on fiche presence and visibility of time container
  const isFiche = !!mission.fiche;
  const radioFiche = document.querySelector('input[name="mission-type"][value="fiche"]');
  const radioTaches = document.querySelector('input[name="mission-type"][value="taches"]');
  
  if (isFiche) {
    if (radioFiche) radioFiche.checked = true;
    timeInputsContainer.style.display = "none";
    lblMissionDate.textContent = "Date d'échéance";
  } else {
    if (radioTaches) radioTaches.checked = true;
    timeInputsContainer.style.display = "flex";
    lblMissionDate.textContent = "Date";
  }

  addMissionModal.classList.remove("hidden");
  
  // Phase handling
  newPhaseInput.style.display = "none";
  missionPhaseSelect.style.display = "block";
  btnToggleNewPhase.textContent = "+";
  newPhaseInput.value = "";
  missionPhaseSelect.value = mission.phase || "";

  inputMissionTitle.focus();
}

function closeModal() {
  modal.classList.add("hidden");
}

function openFicheModal(taskId) {
  const task = tachesData.find((t) => t.Id == taskId);
  if (!task) return;

  inputFicheTaskId.value = taskId;
  
  if (task.fiche) {
    // Si un parseur marked est dispo, on l'utilise, sinon on affiche le raw.
    if (typeof marked !== 'undefined') {
      inputFicheContent.innerHTML = marked.parse(task.fiche);
    } else {
      inputFicheContent.innerText = task.fiche;
    }
  } else {
    inputFicheContent.innerHTML = "<em>Fiche vide</em>";
  }

  ficheModal.classList.remove("hidden");
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
      referents_id: referentId ? parseInt(referentId) : null,
    });
    if (success) {
      const t = tachesData.find((x) => x.Id == editingTaskId);
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
    // Créer un objet Date local puis l'envoyer en ISO UTC
    dateDebutISO = new Date(`${devDate}T${devTimeDebut}:00`).toISOString();
  }
  if (devDate && devTimeFin) {
    // Créer un objet Date local puis l'envoyer en ISO UTC
    dateFinISO = new Date(`${devDate}T${devTimeFin}:00`).toISOString();
  }

  if (isEditing) {
      const phase = newPhaseInput.style.display === "block" ? newPhaseInput.value.trim() : missionPhaseSelect.value;

      const success = await updateMission(editingMissionId, {
        titre,
        date_debut: dateDebutISO,
        date_fin: dateFinISO,
        phase: phase || null,
      });
      if (success) {
        const m = missionsData.find((x) => x.Id == editingMissionId);
        if (m) {
          m.titre = titre;
          m.date_debut = dateDebutISO;
          m.date_fin = dateFinISO;
          m.phase = phase || null;
        }
        populatePhaseFilter();
        renderDashboard();
        addMissionModal.classList.add("hidden");
    } else {
      alert("Erreur lors de la modification");
    }
    } else {
      const phase = newPhaseInput.style.display === "block" ? newPhaseInput.value.trim() : missionPhaseSelect.value;
      
      const typeRadio = document.querySelector('input[name="mission-type"]:checked');
      const isFiche = typeRadio && typeRadio.value === "fiche";
      const ficheContent = isFiche ? "<p>Ajouter votre texte</p>" : null;

      const newMission = await createMission(titre, dateDebutISO, dateFinISO, phase || null, ficheContent);
      if (newMission) {
        newMission.titre = titre;
        newMission.date_debut = dateDebutISO;
        newMission.date_fin = dateFinISO;
        newMission.phase = phase || null;
        newMission.fiche = ficheContent;
        newMission.Referents_Assignes = [];
        missionsData.push(newMission);
        populatePhaseFilter();
        renderDashboard();
        addMissionModal.classList.add("hidden");
    } else {
      alert("Erreur réseau");
    }
  }
  btnSaveMission.textContent = "Ajouter";
  btnSaveMission.disabled = false;
}

function openEditMissionFicheModal(missionId) {
  const mission = missionsData.find((m) => m.Id == missionId);
  if (!mission) return;

  inputEditMissionFicheId.value = missionId;
  
  if (missionFicheQuill) {
    // Si la fiche n'est pas vide on set, sinon on set vide (même si par défaut ça devrait être Ajouter votre texte)
    missionFicheQuill.clipboard.dangerouslyPasteHTML(mission.fiche || "");
  }

  editMissionFicheModal.classList.remove("hidden");
}

async function handleSaveMissionFiche() {
  const missionId = inputEditMissionFicheId.value;
  if (!missionId) return;

  let newFicheContent = "";
  if (missionFicheQuill) {
    newFicheContent = missionFicheQuill.root.innerHTML;
  }

  btnSaveMissionFiche.textContent = "Enregistrement...";
  btnSaveMissionFiche.disabled = true;

  const m = missionsData.find((x) => x.Id == missionId);
  const success = await updateMission(missionId, { fiche: newFicheContent });
  
  if (success) {
    if (m) {
      m.fiche = newFicheContent;
    }
    renderDashboard();
    editMissionFicheModal.classList.add("hidden");
  } else {
    alert("Erreur lors de l'enregistrement de la fiche.");
  }
  
  btnSaveMissionFiche.textContent = "Enregistrer";
  btnSaveMissionFiche.disabled = false;
}

async function handleAddReferent() {
  const nom = inputNewReferentName.value.trim();
  if (!nom) return;

  // Vérification d'unicité (insensible à la casse et sans espaces superflus)
  const exists = referentsData.some(
    (ref) => ref.nom.trim().toLowerCase() === nom.toLowerCase(),
  );

  if (exists) {
    alert("Ce référent existe déjà (le nom doit être unique)");
    inputNewReferentName.value = "";
    return;
  }

  btnAddReferent.disabled = true;
  btnAddReferent.textContent = "...";

  const newRef = await createReferent(nom);
  if (newRef) {
    referentsData.push(newRef);
    referentsData.sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }),
    );
    inputNewReferentName.value = "";
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
  const mission = missionsData.find((m) => m.Id == missionId);
  if (!mission) return;

  const assignedIds = Array.isArray(mission.Referents_Assignes)
    ? mission.Referents_Assignes.map((r) => r.Id)
    : [];

  assignMissionList.innerHTML = "";

  referentsData.forEach((ref) => {
    const isAssigned = assignedIds.includes(ref.Id);
    const div = document.createElement("div");
    div.style.marginBottom = "0.5rem";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "space-between";
    div.innerHTML = `
      <label class="brutal-checkbox-container" style="font-size: 1.1rem; flex: 1;">
        <input type="checkbox" class="assignee-checkbox" value="${ref.Id}" ${isAssigned ? "checked" : ""}>
        <span class="checkmark" style="height:20px; width:20px;"></span>
        <span style="margin-left: 0.5rem;">${ref.nom}</span>
      </label>
      <button class="btn-icon edit-referent" data-id="${ref.Id}" title="Modifier ce référent" style="margin-left: 0.5rem; opacity: 0.6; padding: 0.2rem;">✏️</button>
      <button class="btn-icon delete-referent" data-id="${ref.Id}" title="Supprimer ce référent" style="margin-left: 0.5rem; opacity: 0.6; padding: 0.2rem;">🗑️</button>
    `;

    const cb = div.querySelector("input");
    cb.addEventListener("change", async (e) => {
      progressCounter.innerText = "Mise à jour...";
      const refId = parseInt(e.target.value);
      if (e.target.checked) {
        const success = await linkReferentToMission(missionId, refId);
        if (success) {
          if (!Array.isArray(mission.Referents_Assignes))
            mission.Referents_Assignes = [];
          mission.Referents_Assignes.push({ Id: refId });
        }
      } else {
        const success = await unlinkReferentFromMission(missionId, refId);
        if (success && Array.isArray(mission.Referents_Assignes)) {
          mission.Referents_Assignes = mission.Referents_Assignes.filter(
            (r) => r.Id != refId,
          );
        }
      }
      renderDashboard(); // Re-render to update badges
    });

    const btnEdit = div.querySelector(".edit-referent");
    btnEdit.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newNom = prompt(`Modifier le nom du référent :`, ref.nom);
      if (newNom && newNom.trim() !== "" && newNom !== ref.nom) {
        progressCounter.innerText = "Mise à jour...";
        const success = await updateReferent(ref.Id, newNom.trim());
        if (success) {
          ref.nom = newNom.trim();
          referentsData.sort((a, b) =>
            a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }),
          );
          populateReferentFilter();
          renderDashboard();
          openAssignMissionModal(missionId);
        } else {
          alert("Erreur lors de la modification");
        }
      }
    });

    const btnDel = div.querySelector(".delete-referent");
    btnDel.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Supprimer définitivement le référent "${ref.nom}" ?`))
        return;

      progressCounter.innerText = "Suppression...";
      const success = await deleteReferent(ref.Id);
      if (success) {
        referentsData = referentsData.filter((r) => r.Id != ref.Id);
        // Clean up assignment if it was assigned to this mission
        if (Array.isArray(mission.Referents_Assignes)) {
          mission.Referents_Assignes = mission.Referents_Assignes.filter(
            (r) => r.Id != ref.Id,
          );
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

  assignMissionModal.classList.remove("hidden");
}
