# Tache Orga Compet

Outil de gestion des missions et tâches pour le **Championnat de France d'Escalade Jeunes**. Permet d'organiser les équipes, les bénévoles (référents) et les missions logistiques d'une compétition.

## Fonctionnalités

- **Missions** : création de missions de type "tâches" (avec checklist) ou "fiche" (contenu riche HTML)
- **Tâches** : création, assignation, réorganisation par glisser-déposer, marquage terminé
- **Référents** : gestion des bénévoles, assignation aux missions
- **Filtres** : par référent, par statut (à faire / terminé), par phase
- **Phases** : catégorisation des missions par phase de compétition
- **Archive** : archivage des missions terminées, vue lecture seule
- **Indicateurs visuels** : carte rouge si aucun référent, verte si toutes tâches terminées

## Stack

| Couche | Technologie |
|--------|-------------|
| Bundler | Vite 7 |
| Frontend | Vanilla JS (ES modules), HTML5, CSS3 |
| Base de données | NocoDB (API REST) |
| Hébergement | GitHub Pages |
| CI/CD | GitHub Actions |
| Éditeur riche | Quill.js (CDN) |
| Markdown | Marked.js (CDN) |
| Drag & drop | SortableJS (CDN) |

## Installation locale

### Prérequis

- Node.js 20+
- Accès à l'instance NocoDB (`https://nocodb.jpcloudkit.fr`)

### Démarrage

```bash
git clone https://github.com/<org>/tache-orga-compet.git
cd tache-orga-compet
npm install
```

Créer un fichier `.env` à la racine :

```env
VITE_GATEKEEPER_PASSWORD=<mot_de_passe>
VITE_NOCODB_TOKEN=<token_api_nocodb>
```

```bash
npm run dev
```

L'application est disponible sur `http://localhost:5173/tache-orga-compet/`.

## Scripts disponibles

```bash
npm run dev       # Serveur de développement
npm run build     # Build de production (dossier dist/)
npm run preview   # Prévisualisation du build de production
```

## Déploiement

Le déploiement est automatique via GitHub Actions à chaque push sur `main`.

Les secrets GitHub suivants doivent être configurés dans le dépôt :
- `VITE_GATEKEEPER_PASSWORD`
- `VITE_NOCODB_TOKEN`

## Accès à l'application

Un mot de passe unique (gatekeeper) protège l'accès. Il est stocké dans `VITE_GATEKEEPER_PASSWORD`. La session est maintenue via `sessionStorage` (réinitialisée à la fermeture de l'onglet).

## Pages

| URL | Description |
|-----|-------------|
| `/` | Tableau de bord principal (missions actives) |
| `/archive.html` | Vue des missions archivées (lecture seule) |
