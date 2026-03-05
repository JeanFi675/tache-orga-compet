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
  // Filtre les tâches par mission_id
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records?where=(mission_id,eq,${missionId})&limit=100`;
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
 * Met à jour le statut "est_terminee" d'une tâche
 */
export async function updateTache(tacheId, estTerminee) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify([
        {
          Id: tacheId,
          est_terminee: estTerminee
        }
      ]
      )
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour de la tâche");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Crée une nouvelle tâche et l'assigne à une mission
 */
export async function createTache(missionId, titre) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          titre: titre,
          est_terminee: false,
          mission_id: missionId
        }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la création de la tâche");
    const data = await res.json();
    return data[0]; // retourne la tâche créée
  } catch (error) {
    console.error(error);
    return null;
  }
}
