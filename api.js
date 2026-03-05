// src/api.js
const NOCODB_URL = "https://nocodb.jpcloudkit.fr";
const BASE_ID = "pt2u00cunpbeb4g";
const NOCODB_TOKEN = import.meta.env.VITE_NOCODB_TOKEN;

// Ids des tables
const TABLE_MISSIONS = "m4ppq6sdvuq9vfi";
const TABLE_TACHES = "m5vxp1wj7nwxgg6";
const TABLE_REFERENTS = "m3tn5yugf5qi196";

const headers = {
  "xc-token": NOCODB_TOKEN,
  "Content-Type": "application/json"
};

/**
 * Récupère la liste des missions triées par date de début
 */
export async function fetchMissions() {
  // On récupère les missions avec les liens vers les tâches et référents
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records?sort=date_debut&limit=100`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur lors de la récupération des missions");
    const data = await res.json();
    return data.list;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Récupère les sous-tâches liées à une mission
 */
export async function fetchTaches(missionId) {
  // Filtre les tâches par missions_id (ForeignKey)
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records?where=(missions_id,eq,${missionId})&limit=100`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur lors de la récupération des tâches");
    const data = await res.json();
    return data.list;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Récupère tous les référents
 */
export async function fetchReferents() {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_REFERENTS}/records?limit=100`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur lors de la récupération des référents");
    const data = await res.json();
    return data.list;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Met à jour une tâche (est_terminee, titre, etc.)
 */
export async function updateTache(tacheId, updates) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify([
        {
          Id: tacheId,
          ...updates
        }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour de la tâche");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Met à jour une mission (titre, etc.)
 */
export async function updateMission(missionId, updates) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify([
        {
          Id: missionId,
          ...updates
        }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour de la mission");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Crée une nouvelle tâche et l'assigne à une mission
 */
export async function createTache(missionId, titre, referentId = null) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  
  const payload = {
    titre: titre,
    est_terminee: false,
    missions_id: parseInt(missionId)
  };

  if (referentId) {
    payload.referents_id = parseInt(referentId);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([payload])
    });
    if (!res.ok) throw new Error("Erreur lors de la création de la tâche");
    const data = await res.json();
    
    // NocoDB API v2 bulk endpoints sometimes only return the generated Id.
    // We augment the local object with the known submitted values to ensure immediate UI rendering is complete.
    const createdTask = data[0];
    createdTask.titre = createdTask.titre || titre;
    createdTask.est_terminee = createdTask.est_terminee || false;
    
    return createdTask;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Supprime une tâche
 */
export async function deleteTache(tacheId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify([
        { Id: tacheId }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la suppression de la tâche");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Crée une nouvelle mission
 */
export async function createMission(titre, date_debut) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          titre: titre,
          date_debut: date_debut || null
        }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la création de la mission");
    const data = await res.json();
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Supprime une mission
 */
export async function deleteMission(missionId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify([
        { Id: missionId }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la suppression de la mission");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Lie un référent à une mission
 */
export async function linkReferentToMission(missionId, referentId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/links/cj4bl5l73xtl2t3/records/${missionId}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        { Id: referentId }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de l'assignation du référent");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Délie un référent d'une mission
 */
export async function unlinkReferentFromMission(missionId, referentId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/links/cj4bl5l73xtl2t3/records/${missionId}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify([
        { Id: referentId }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la désassignation du référent");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
