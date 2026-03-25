# Component Mapping

Où trouver quoi dans le code — guide de navigation rapide.

## Par fonctionnalité

| Fonctionnalité | Fichier | Fonction / Zone |
|----------------|---------|-----------------|
| Login / session | `main.js` | `handleLogin`, check `sessionStorage` |
| Login archive | `archive.js` | listener `loginForm`, check `sessionStorage` |
| Chargement initial | `dashboard.js` | `initDashboard()` |
| Rendu des cartes missions | `dashboard.js` | `renderDashboard()` |
| Filtres (référent, statut, phase, pôle) | `dashboard.js` | début de `renderDashboard()` + `populate*Filter()` |
| Création mission | `dashboard.js` | `handleCreateMission()` |
| Édition mission (titre, dates) | `dashboard.js` | `handleCreateMission()` (mode édition via `editingMissionId`) |
| Suppression mission | `dashboard.js` | listener `btn-delete-mission` (délégation) |
| Archivage / désarchivage mission | `dashboard.js` / `archive.js` | listeners `btn-archive-mission` / `btn-unarchive-mission` |
| Éditeur fiche mission (Quill) | `dashboard.js` | `handleSaveMissionFiche()`, `missionFicheQuill` |
| Création tâche | `dashboard.js` | `handleCreateTask()` |
| Édition tâche (inline) | `dashboard.js` | listener `blur` sur `.task-title` |
| Suppression tâche | `dashboard.js` | listener `btn-delete-task` (délégation) |
| Marquer tâche terminée | `dashboard.js` | listener `.task-checkbox` (délégation) |
| Fiche tâche (markdown) | `dashboard.js` | listeners `btn-open-fiche` / `btn-save-fiche` |
| Drag & drop tâches | `dashboard.js` | initialisation SortableJS + `bulkUpdateTaches` |
| Gestion référents (CRUD) | `dashboard.js` | `handleAddReferent()`, listeners `btn-delete-referent`, `btn-edit-referent` |
| Assignation référent ↔ mission | `dashboard.js` | modal `assign-mission-modal`, `linkReferentToMission` / `unlinkReferentFromMission` |
| Export JSON | `dashboard.js` | `handleExportJSON()` |
| Journalisation historique | `dashboard.js` | appels `createHistorique(...)` dispersés après chaque action |
| Vue archive (lecture seule) | `archive.js` | `initArchive()`, `renderArchive()` |

## Par couche

### `api.js` — fonctions exportées

| Fonction | Description |
|----------|-------------|
| `fetchMissions(archived)` | Liste missions actives ou archivées |
| `fetchTaches(missionId)` | Tâches d'une mission |
| `fetchReferents()` | Tous les référents |
| `fetchMissionReferents(missionId)` | Référents liés à une mission (workaround NocoDB v2) |
| `createMission(titre, date_debut, date_fin, phase, fiche, pole)` | Nouvelle mission |
| `updateMission(missionId, updates)` | Mise à jour mission |
| `deleteMission(missionId)` | Supprime tâches puis mission (cascade manuelle) |
| `createTache(missionId, titre, referentId)` | Nouvelle tâche |
| `updateTache(tacheId, updates)` | Mise à jour tâche |
| `deleteTache(tacheId)` | Suppression tâche |
| `bulkUpdateTaches(updates[])` | Mise à jour en masse (ordre drag & drop) |
| `createReferent(nom)` | Nouveau référent |
| `updateReferent(referentId, nom)` | Renommage référent |
| `deleteReferent(referentId)` | Suppression référent |
| `linkReferentToMission(missionId, referentId)` | Lien référent ↔ mission |
| `unlinkReferentFromMission(missionId, referentId)` | Délier référent ↔ mission |
| `createHistorique(commentaire)` | Log d'activité (append-only) |

### État global en mémoire (`dashboard.js`)

```js
let missionsData = [];    // tableau des missions (avec .Referents_Assignes injecté)
let tachesData = [];      // toutes les tâches (toutes missions confondues)
let referentsData = [];   // tous les référents (triés alphabétiquement)
```

Pour filtrer les tâches d'une mission : `tachesData.filter(t => t.missions_id === m.Id)`.

## Modaux HTML (`index.html`)

| ID modal | Usage |
|----------|-------|
| `add-task-modal` | Création / édition tâche |
| `add-mission-modal` | Création / édition mission |
| `fiche-task-modal` | Édition fiche markdown d'une tâche |
| `edit-mission-fiche-modal` | Éditeur Quill fiche mission |
| `assign-mission-modal` | Gestion des référents d'une mission |
