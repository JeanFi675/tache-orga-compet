# Workflow Patterns

Patterns de développement récurrents à respecter dans ce projet.

## Cycle de rendu

Le rendu est **toujours complet**. Jamais de manipulation partielle du DOM.

```
Action utilisateur
  → mise à jour de l'état en mémoire (missionsData / tachesData / referentsData)
  → renderDashboard()  ← reconstruit tout le DOM des missions
```

**Exception acceptable** : masquer/afficher un modal (`.classList.add('hidden')`).

## Pattern mise à jour optimiste

Pour toute action CRUD, l'UI est mise à jour **avant** la confirmation API.

```
1. Mettre à jour l'objet en mémoire (ex: tache.est_terminee = true)
2. renderDashboard()   ← affichage immédiat
3. await updateTache(id, { est_terminee: true })
4. Si erreur → rollback en mémoire + renderDashboard()
```

## Ajout d'une fonctionnalité CRUD

Ordre strict à respecter :

1. **`api.js`** — ajouter la/les fonction(s) API (voir [Conventions](CONVENTIONS.md#fonctions-api))
2. **`dashboard.js`** — importer et appeler la fonction, mettre à jour l'état, appeler `renderDashboard()`
3. **`index.html`** — si un nouvel élément HTML est nécessaire (modal, bouton, input)
4. **`style.css`** — styler selon le vocabulaire brutaliste existant

## Initialisation des données (`initDashboard`)

```
initDashboard()
  ├── fetchMissions(archived=false)   ┐
  ├── fetchReferents()                ┘ en parallèle (Promise.all)
  │
  ├── Pour chaque mission (Promise.all) :
  │     └── fetchTaches(mission.Id)
  │
  ├── Pour chaque mission (Promise.all) :
  │     └── fetchMissionReferents(mission.Id)  ← workaround NocoDB v2
  │           → injecté dans mission.Referents_Assignes
  │
  ├── populateReferentFilter()
  ├── populatePhaseFilter()
  ├── populatePoleFilter()
  ├── renderDashboard()
  └── attacher les event listeners (une seule fois)
```

> **Attention** : les event listeners sont attachés une seule fois dans `initDashboard`. Ne pas réappeler `initDashboard` pour rafraîchir — appeler `renderDashboard()` directement.

## Drag & drop (réordonnancement des tâches)

```
SortableJS reorder event
  → recalculer ordre = index + 1 pour chaque tâche visible
  → mettre à jour tachesData en mémoire
  → bulkUpdateTaches([{ Id, ordre }, ...])  ← une seule requête PATCH
```

## Filtres

Les filtres sont lus **à chaque appel** de `renderDashboard()` depuis les `<select>` du DOM :

```js
const selectedReferent = filterReferent.value;   // '' = tous
const selectedStatus   = filterStatus.value;     // '' | 'todo' | 'done'
const selectedPhase    = filterPhase.value;       // '' = toutes
const selectedPole     = filterPole.value;        // '' = tous
```

Pour ajouter un filtre : ajouter un `<select>` dans `index.html`, lire sa valeur dans `renderDashboard()`, attacher `addEventListener('change', renderDashboard)` dans `initDashboard`.

## Journalisation (`createHistorique`)

Appeler `createHistorique(commentaire)` après chaque action significative (création, suppression, archivage). La fonction est fire-and-forget (pas d'await bloquant sur le chemin critique).

```js
// Exemple
await deleteMission(id);
createHistorique(`Mission supprimée : ${titre}`);  // non-bloquant
```
