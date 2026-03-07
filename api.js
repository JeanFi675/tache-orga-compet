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
 * @param {boolean} archived Si vrai, récupère les archivées, sinon les non-archivées
 */
export async function fetchMissions(archived = false) {
  // On récupère les missions filtrées par statut d'archivage
  const where = `(est_archivee,${archived ? 'checked' : 'notchecked'})`;
  // On utilise nested[Referents_Assignes][all]=true pour récupérer les objets référents complets au lieu du simple compteur
  // On essaye de forcer le nesting sur l'ID technique du lien (cj4bl5l73xtl2t3) au cas où le titre ne fonctionnerait pas
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records?sort=date_debut&where=${where}&limit=100&nested[Referents_Assignes][all]=true&nested[cj4bl5l73xtl2t3][all]=true`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Erreur lors de la récupération des missions");
    const data = await res.json();
    return data.list;
  } catch (error) {

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
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Erreur lors de la récupération des tâches");
    const data = await res.json();

    return data.list;
  } catch (error) {

    return [];
  }
}

/**
 * Récupère tous les référents
 */
export async function fetchReferents() {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_REFERENTS}/records?limit=100`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Erreur lors de la récupération des référents");
    const data = await res.json();
    return data.list;
  } catch (error) {

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

    return false;
  }
}

/**
 * Met à jour plusieurs tâches en une seule requête (ex: pour l'ordre)
 * @param {Array} updates Tableau d'objets contenant au minimum l'Id de la tâche et les champs à modifier
 */
export async function bulkUpdateTaches(updates) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour en masse des tâches");
    return true;
  } catch (error) {
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

    return false;
  }
}

/**
 * Crée une nouvelle mission
 */
export async function createMission(titre, date_debut, date_fin, phase = null, fiche = null) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          titre: titre,
          date_debut: date_debut || null,
          date_fin: date_fin || null,
          phase: phase || null,
          fiche: fiche || null
        }
      ])
    });
    if (!res.ok) throw new Error("Erreur lors de la création de la mission");
    const data = await res.json();
    const createdMission = data[0];
    // Augment local object as NocoDB may only return Id
    createdMission.titre = createdMission.titre || titre;
    createdMission.date_debut = createdMission.date_debut || date_debut;
    createdMission.date_fin = createdMission.date_fin || date_fin;
    createdMission.fiche = createdMission.fiche || fiche;
    return createdMission;
  } catch (error) {

    return null;
  }
}

/**
 * Supprime une mission et toutes ses tâches rattachées
 */
export async function deleteMission(missionId) {
  const id = parseInt(missionId);

  
  try {
    // 1. Récupérer les tâches rattachées
    const tasks = await fetchTaches(id);

    
    // 2. Si des tâches existent, les supprimer en bloc AVANT de supprimer la mission
    if (tasks && tasks.length > 0) {
      const taskDeleteUrl = `${NOCODB_URL}/api/v2/tables/${TABLE_TACHES}/records`;
      const taskBody = tasks.map(t => ({ Id: t.Id }));
      

      const taskRes = await fetch(taskDeleteUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(taskBody)
      });
      
      if (!taskRes.ok) {
        const errText = await taskRes.text();

        // On continue quand même ? Si c'est un problème de FK restrict ça échouera à l'étape 3.
      }
    }

    // 3. Supprimer la mission

    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/records`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify([
        { Id: id }
      ])
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erreur lors de la suppression de la mission: ${errText}`);
    }
    

    return true;
  } catch (error) {

    return false;
  }
}

/**
 * Récupère les référents assignés à une mission spécifique via la table de liaison
 */
export async function fetchMissionReferents(missionId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/links/cj4bl5l73xtl2t3/records/${missionId}?limit=100`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Erreur lors de la récupération des référents de la mission");
    const data = await res.json();
    return data.list; // Retourne la liste des objets (ou IDs) liés
  } catch (error) {
    return [];
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

    return false;
  }
}
/**
 * Crée un nouveau référent
 */
export async function createReferent(nom) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_REFERENTS}/records`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ nom }])
    });
    if (!res.ok) throw new Error("Erreur lors de la création du référent");
    const data = await res.json();
    const createdRef = data[0];
    // Augmenter l'objet car NocoDB peut ne renvoyer que l'Id
    createdRef.nom = createdRef.nom || nom;
    return createdRef;
  } catch (error) {

    return null;
  }
}

/**
 * Supprime un référent
 */
export async function deleteReferent(referentId) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_REFERENTS}/records`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify([{ Id: referentId }])
    });
    if (!res.ok) throw new Error("Erreur lors de la suppression du référent");
    return true;
  } catch (error) {

    return false;
  }
}
/**
 * Met à jour le nom d'un référent
 */
export async function updateReferent(referentId, nom) {
  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_REFERENTS}/records`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify([{ Id: referentId, nom }])
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour du référent");
    return true;
  } catch (error) {
    return false;
  }
}
