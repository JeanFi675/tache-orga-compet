# Conventions

Standards de code et règles métier à respecter dans ce projet.

## Fonctions API (`api.js`)

### Valeurs de retour

| Cas | Valeur retournée |
|-----|-----------------|
| Liste vide ou erreur fetch | `[]` |
| Objet non trouvé ou erreur | `false` |
| Création échouée | `null` |
| Succès d'une mise à jour / suppression | `true` |
| Succès d'une création | objet créé (augmenté si NocoDB ne renvoie que l'`Id`) |

### Augmentation des objets créés

NocoDB v2 bulk POST ne renvoie parfois que l'`Id`. Toujours augmenter l'objet retourné :

```js
// GOOD
const created = data[0];
created.titre = created.titre || titre;  // fallback sur la valeur soumise
return created;

// BAD — retourner data[0] brut peut donner un objet incomplet à renderDashboard
```

### IDs NocoDB

Les IDs de base, tables et FK sont des **constantes en haut de `api.js`**. Ne jamais les écrire en dur ailleurs. Ne jamais les modifier sans validation explicite — toute modification casse la production.

## Dates

- **Stockage** : toujours envoyer en ISO UTC (`new Date(...).toISOString()`)
- **Affichage** : toujours convertir avec `toLocaleDateString('fr-FR')`
- **Historique** : format `DD-MM-YYYY` (construit manuellement dans `createHistorique`)

## Référents — unicité

Validation insensible à la casse **côté frontend uniquement** (pas de contrainte NocoDB). Avant de créer un référent, vérifier :

```js
const exists = referentsData.some(
  r => r.nom.toLowerCase() === nom.toLowerCase()
);
```

## CSS — design brutaliste

Variables clés :

```css
--color-ice: #8bbfd5;
--border-thick: 4px solid black;
--shadow-brutal: 6px 6px 0px 0px black;
```

- Pas de `border-radius` sauf sur le FAB
- Fonts : Inter (titres), Space Grotesk (corps)
- Noms de classes : kebab-case descriptif (`mission-card`, `task-item`, `btn-save-task`)

## Gatekeeper (authentification)

Le mot de passe est compilé dans le bundle via `import.meta.env.VITE_GATEKEEPER_PASSWORD`. La session est dans `sessionStorage` (expire à la fermeture de l'onglet). Ce mécanisme protège contre les accès accidentels, pas contre un attaquant lisant le bundle.

## Variables d'environnement

| Variable | Fichier | Usage |
|----------|---------|-------|
| `VITE_GATEKEEPER_PASSWORD` | `.env` / secrets GitHub | Mot de passe d'accès |
| `VITE_NOCODB_TOKEN` | `.env` / secrets GitHub | Token API NocoDB |

Ne jamais committer `.env`.

## Types de missions

Distingués par la présence du champ `fiche` :

| `fiche` | Type | Contenu |
|---------|------|---------|
| rempli (HTML) | "fiche" | Éditeur Quill, pas de checklist |
| vide / null | "tâches" | Checklist SortableJS |
