# Architecture

## Vue d'ensemble

Application statique (SPA-lite) sans framework, déployée sur GitHub Pages. Le backend est entièrement délégué à **NocoDB**, une interface REST/BaaS hébergée sur `nocodb.jpcloudkit.fr`.

```
┌─────────────────────────────────────────────────┐
│                  GitHub Pages                    │
│                                                  │
│  ┌──────────────┐      ┌──────────────────────┐  │
│  │  index.html  │      │   archive.html       │  │
│  │  dashboard.js│      │   archive.js         │  │
│  └──────┬───────┘      └──────────┬───────────┘  │
│         │                         │               │
│         └──────────┬──────────────┘               │
│                    │                              │
│              ┌─────▼──────┐                       │
│              │   api.js   │                       │
│              └─────┬──────┘                       │
└────────────────────┼────────────────────────────-─┘
                     │ HTTPS (REST)
              ┌──────▼──────────┐
              │    NocoDB API   │
              │ nocodb.jpcloud… │
              └─────────────────┘
```

## Structure des fichiers

```
tache-orga-compet/
├── index.html          # Dashboard principal (login + app)
├── archive.html        # Vue archive (login + lecture seule)
├── main.js             # Entry point : login, session, init dashboard
├── dashboard.js        # Logique principale : rendu, CRUD, filtres, événements
├── archive.js          # Logique archive : affichage, filtres, désarchivage
├── api.js              # Couche d'accès NocoDB (22 fonctions)
├── style.css           # Styles globaux (design brutaliste)
├── vite.config.js      # Config Vite (base path GitHub Pages)
├── package.json
├── .env                # Variables d'environnement (ne pas committer)
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD GitHub Actions → GitHub Pages
```

Les fichiers dans `src/` sont des vestiges du template Vite initial, non utilisés.

## Schéma de données (NocoDB)

```
Referents
├── Id (PK)
└── nom (string, unique insensible à la casse)
       │
       │ many-to-many (junction table NocoDB)
       │
Missions ──────────────────────────────────────────
├── Id (PK)
├── titre (string)
├── date_debut (datetime ISO UTC)
├── date_fin (datetime ISO UTC)
├── phase (string, optionnel)
├── pole (string, optionnel — axe organisationnel)
├── est_archivee (boolean)
└── fiche (HTML, optionnel — missions de type "fiche")
       │
       │ one-to-many
       │
Taches
├── Id (PK)
├── titre (string)
├── est_terminee (boolean)
├── ordre (integer — tri drag & drop)
├── missions_id (FK → Missions)
├── referents_id (FK → Referents, optionnel)
└── fiche (markdown, optionnel)

Historique (log d'activité, append-only)
├── Id (PK)
├── Date (string format DD-MM-YYYY)
└── commentaire (string — description de l'action)
```

**IDs NocoDB :**
- Base : `pt2u00cunpbeb4g`
- Table Missions : `m4ppq6sdvuq9vfi`
- Table Taches : `m5vxp1wj7nwxgg6`
- Table Referents : `m3tn5yugf5qi196`
- Table Historique : `mo9ms1hst2out76`
- Junction Referents↔Missions : `cj4bl5l73xtl2t3`

## Flux de données

### Initialisation (chargement de page)

```
initDashboard()
  ├── fetchMissions(archived=false)
  ├── fetchReferents()
  └── Pour chaque mission :
        ├── fetchTaches(missionId)
        └── fetchMissionReferents(missionId)  ← workaround NocoDB v2
  → renderDashboard()
```

### Mise à jour (action utilisateur)

```
Action utilisateur
  → Mise à jour optimiste de l'UI (immédiate)
  → Appel API asynchrone (api.js)
  → Re-rendu si succès / rollback si erreur
```

## Modules et responsabilités

### `api.js`
Couche réseau pure. Aucun accès au DOM. Toutes les fonctions sont `async`, retournent les données ou `false`/`[]` en cas d'erreur. Les identifiants NocoDB (base, tables, FK) sont des constantes en tête de fichier.

### `dashboard.js`
Module principal. Contient :
- `initDashboard()` : orchestration initiale
- `renderDashboard()` : génération HTML des cartes missions + tâches
- Gestionnaires d'événements (inline et délégués)
- Logique de filtrage (référent, statut, phase)
- Intégration SortableJS (drag & drop avec `bulkUpdateTaches`)
- Intégration Quill.js (éditeur fiche mission)

### `archive.js`
Version simplifiée et lecture seule du dashboard. Fonctionnalités : affichage, filtres, bouton désarchiver.

### `main.js`
Gestion du gatekeeper (formulaire de login, `sessionStorage`), puis délégation à `initDashboard()`.

## Choix techniques

| Décision | Raison |
|----------|--------|
| Vanilla JS sans framework | Simplicité, pas de build complexe, équipe réduite |
| NocoDB comme backend | BaaS rapide à configurer, API REST prête à l'emploi |
| GitHub Pages | Hébergement gratuit, déploiement automatique simple |
| Vite | Build rapide, support ESM natif, DX moderne sans framework |
| Quill via CDN | Éditeur riche sans alourdir le bundle npm |
| SortableJS | Drag & drop robuste avec support mobile |
| Design brutaliste | Identité visuelle forte, CSS simple et maintenable |

## Authentification

Gatekeeper simple côté client : le mot de passe est compilé dans le bundle JavaScript lors du build (via `import.meta.env.VITE_GATEKEEPER_PASSWORD`). La session est stockée dans `sessionStorage`. Ce mécanisme protège contre les accès accidentels, pas contre un attaquant motivé qui lirait le bundle.

## Déploiement

```
push sur main
  → GitHub Actions (deploy.yml)
  → npm install + npm run build
      (avec injection des secrets GitHub)
  → Vite génère /dist
  → Upload sur GitHub Pages
```

La propriété `base: '/tache-orga-compet/'` dans `vite.config.js` est essentielle pour le sous-chemin GitHub Pages.
