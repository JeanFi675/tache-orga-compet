# Contexte pour agents IA

## Projet

Outil de gestion de missions et tâches pour le **Championnat de France d'Escalade Jeunes (CAF 2026)**. Application web statique (Vite + Vanilla JS) avec NocoDB comme backend API.

## Règles importantes

- **Ne jamais modifier les IDs NocoDB** dans `api.js` (base, tables, FK) sans validation explicite — toute modification casse l'accès aux données de production.
- **Ne pas committer `.env`** — contient le mot de passe gatekeeper et le token NocoDB.
- **Pas de framework JS** (React, Vue, etc.) — c'est un choix délibéré. Rester en Vanilla JS.
- **Pas de dépendances npm inutiles** — Quill, Marked, SortableJS sont chargés via CDN dans les HTML.
- **La base `vite.config.js` est `/tache-orga-compet/`** — obligatoire pour GitHub Pages. Ne pas supprimer.

## Architecture en un coup d'œil

```
main.js → login → initDashboard()
dashboard.js → rendu + événements + filtres
archive.js → vue lecture seule des missions archivées
api.js → toutes les requêtes NocoDB (ne touche jamais au DOM)
```

## Modèle de données

- **Missions** : ont un type implicite (présence ou non du champ `fiche`)
  - `fiche` rempli → mission de type "fiche" (contenu HTML Quill)
  - `fiche` vide → mission de type "tâches" (checklist)
- **Taches** : liées à une mission, ordonnées par `ordre` (entier), optionnellement assignées à un référent
- **Referents** : bénévoles/responsables, liés aux missions en many-to-many via junction NocoDB

## Patterns à respecter

### Modification des données
Toujours passer par les fonctions de `api.js`. Ne jamais appeler NocoDB directement dans `dashboard.js`.

### Rendu
Le rendu est déclenché par `renderDashboard()`. Cette fonction lit l'état global (tableaux `missions`, `taches`, `referents` en mémoire) et reconstruit le DOM entièrement. Ne pas manipuler le DOM partiellement sans raison — faire un `renderDashboard()` complet.

### Ajout d'une nouvelle fonctionnalité
1. Ajouter la/les fonction(s) API dans `api.js`
2. Ajouter la logique dans `dashboard.js` (ou `archive.js`)
3. Si nouvel élément HTML nécessaire : l'ajouter dans `index.html` (ou `archive.html`)
4. Styler dans `style.css` en respectant le vocabulaire brutaliste existant

### Filtres
Les filtres sont appliqués dans `renderDashboard()` avant le rendu. L'état des filtres est lu depuis les éléments `<select>` du DOM.

## Variables d'environnement

| Variable | Usage |
|----------|-------|
| `VITE_GATEKEEPER_PASSWORD` | Mot de passe d'accès à l'app |
| `VITE_NOCODB_TOKEN` | Token d'authentification NocoDB |

Ces deux variables sont requises pour `npm run dev` et `npm run build`. En production, elles sont injectées par GitHub Actions depuis les secrets du dépôt.

## Points d'attention connus

- **Workaround NocoDB v2** : les relations many-to-many (référents ↔ missions) nécessitent un appel API séparé par mission (`fetchMissionReferents`). NocoDB ne les retourne pas dans la réponse de liste.
- **Dates** : toujours convertir en ISO UTC (`toISOString()`) avant d'envoyer à l'API. L'affichage utilise `toLocaleDateString('fr-FR')`.
- **Suppression de mission** : cascade manuelle — `deleteMission` supprime d'abord toutes les tâches associées, puis la mission.
- **Unicité des référents** : validation insensible à la casse côté frontend (pas de contrainte NocoDB).
- **Drag & drop** : après réorganisation, `bulkUpdateTaches` met à jour le champ `ordre` de toutes les tâches concernées en une seule requête.

## Design system (brutaliste)

Variables CSS clés dans `style.css` :
- `--color-ice: #8bbfd5` — couleur principale
- `--border-thick: 4px solid black`
- `--shadow-brutal: 6px 6px 0px 0px black`
- Fonts : Inter (titres), Space Grotesk (corps)
- Pas de `border-radius` sauf sur le FAB

## Commandes utiles

```bash
npm run dev      # Dev local sur http://localhost:5173/tache-orga-compet/
npm run build    # Build production → dist/
npm run preview  # Tester le build localement
```
