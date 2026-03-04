import { marked } from "marked";
import DOMPurify from "dompurify";
import CryptoJS from "crypto-js";

// Configuration
// Le Token API chiffré. À définir dans votre fichier .env.local
const ENCRYPTED_GITHUB_TOKEN = import.meta.env.VITE_ENCRYPTED_GITHUB_TOKEN || "U2FsdGVkX1+METTRE_LE_VRAI_TOKEN_ICI";
const REPO_OWNER = "JeanFi675"; // Propriétaire du dépôt
const REPO_NAME = "note-orga"; // Nom du dépôt
const FILE_PATH = "content.md"; // Chemin du fichier dans le dépôt

let currentMarkdown = "";
let sectionsData = [];
let allTags = new Set();
let activeTags = new Set();

// Elements
const contentDisplay = document.getElementById("content-display");
const tagsList = document.getElementById("tags-list");
const btnEdit = document.getElementById("btn-edit");
const editorContainer = document.getElementById("editor-container");
const markdownEditor = document.getElementById("markdown-editor");
const btnSave = document.getElementById("btn-save");
const btnCancel = document.getElementById("btn-cancel");
const passwordModal = document.getElementById("password-modal");
const btnModalSubmit = document.getElementById("btn-modal-submit");
const btnModalCancel = document.getElementById("btn-modal-cancel");
const passwordInput = document.getElementById("password-input");

async function init() {
  try {
    // Fetch content.md
    const response = await fetch(`./${FILE_PATH}?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error("Impossible de charger le fichier.");

    currentMarkdown = await response.text();
    parseAndRender(currentMarkdown);
  } catch (e) {
    contentDisplay.innerHTML = `<p style="color:red">Erreur : ${e.message}</p>`;
  }
}

function parseAndRender(markdown) {
  // Basic Markdown to Sections splitter (split by ## heading)
  // We assume the first part might be a `# Main Title` and subsequent parts are `## Section`
  const rawSections = markdown.split(/(?=^##\s)/m);

  sectionsData = [];
  allTags.clear();

  rawSections.forEach((sectionMarkdown, index) => {
    if (!sectionMarkdown.trim()) return;

    // Extract tags (e.g. #Person1, #logistique)
    const tagRegex = /#([a-zA-Z0-9_À-ÿ\-]+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(sectionMarkdown)) !== null) {
      tags.push(match[1].toLowerCase());
      allTags.add(match[1].toLowerCase());
    }

    // Render HTML
    const dirtyHtml = marked.parse(sectionMarkdown);
    const cleanHtml = DOMPurify.sanitize(dirtyHtml);

    sectionsData.push({
      id: `section-${index}`,
      markdown: sectionMarkdown,
      html: cleanHtml,
      tags: tags,
    });
  });

  renderDisplay();
  renderSidebar();
}

function renderDisplay() {
  contentDisplay.innerHTML = "";

  let visibleCount = 0;

  sectionsData.forEach((section) => {
    // Filter logic: if no tags active, show all. If tags active, show if section has AT LEAST ONE active tag.
    let isVisible = true;
    if (activeTags.size > 0) {
      isVisible = section.tags.some((t) => activeTags.has(t));
    }

    if (isVisible) {
      const div = document.createElement("div");
      // If it's the very first section and starting with # , maybe we don't wrap it in a box?
      // Let's just wrap everything in a section block except if it contains only a H1
      if (
        section.html.includes("<h1") &&
        sectionsData.length > 1 &&
        section.html.length < 100
      ) {
        div.innerHTML = section.html;
      } else {
        div.className = "section-block";
        div.innerHTML = section.html;
      }
      contentDisplay.appendChild(div);
      visibleCount++;
    }
  });

  if (visibleCount === 0) {
    contentDisplay.innerHTML =
      "<p>Aucune section ne correspond aux tags sélectionnés.</p>";
  }
}

function renderSidebar() {
  tagsList.innerHTML = "";

  const sortedTags = Array.from(allTags).sort();

  sortedTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    if (activeTags.has(tag)) btn.classList.add("active");
    btn.textContent = `# ${tag}`;

    btn.addEventListener("click", () => {
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        btn.classList.remove("active");
      } else {
        activeTags.add(tag);
        btn.classList.add("active");
      }
      renderDisplay();
    });

    tagsList.appendChild(btn);
  });
}

// ------ Editor & Auth Logic ------

btnEdit.addEventListener("click", () => {
  passwordInput.value = "";
  passwordModal.showModal();
});

btnModalCancel.addEventListener("click", () => {
  passwordModal.close();
});

btnModalSubmit.addEventListener("click", () => {
  const pwd = passwordInput.value;
  if (!pwd) return alert("Veuillez entrer un mot de passe");

  // Pour l'instant on fait confiance et on ouvre l'éditeur
  // En réalité, on devrait vérifier si le décryptage fonctionne
  try {
    // Test déchiffrement
    const bytes = CryptoJS.AES.decrypt(ENCRYPTED_GITHUB_TOKEN, pwd);
    const originalToken = bytes.toString(CryptoJS.enc.Utf8);

    // Si ENCRYPTED_GITHUB_TOKEN est la string par défaut, ça moche l'erreur, on simule l'ouverture.
    if (ENCRYPTED_GITHUB_TOKEN.includes("METTRE_LE_VRAI")) {
      console.warn("Utilisation du mode Mock (pas de vrai Token).");
    } else if (!originalToken) {
      throw new Error("Mauvais mot de passe");
    }

    // C'est bon !
    window.githubToken = originalToken; // stock temporaire
    passwordModal.close();

    // Bascule UI
    contentDisplay.classList.add("hidden");
    editorContainer.classList.remove("hidden");
    markdownEditor.value = currentMarkdown;
  } catch (e) {
    alert("Mot de passe incorrect !");
  }
});

btnCancel.addEventListener("click", () => {
  editorContainer.classList.add("hidden");
  contentDisplay.classList.remove("hidden");
  delete window.githubToken;
});

btnSave.addEventListener("click", async () => {
  const newMarkdown = markdownEditor.value;

  // Update local state right away for snappiness
  currentMarkdown = newMarkdown;
  parseAndRender(currentMarkdown);

  editorContainer.classList.add("hidden");
  contentDisplay.classList.remove("hidden");

  // Sauvegarde en ligne s'il y a un vrai token
  if (window.githubToken && !ENCRYPTED_GITHUB_TOKEN.includes("METTRE_LE_VRAI")) {
      try {
          const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
          
          // 1. Récupérer le SHA du fichier existant
          const getRes = await fetch(url);
          const getJson = await getRes.json();
          
          // 2. Préparer le contenu en Base64 (support UTF-8)
          const contentEncoded = btoa(unescape(encodeURIComponent(newMarkdown)));
          
          // 3. Envoyer la mise à jour
          const putRes = await fetch(url, {
              method: 'PUT',
              headers: {
                  'Authorization': `Bearer ${window.githubToken}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  message: 'Mise à jour orga via interface web',
                  content: contentEncoded,
                  sha: getJson.sha || undefined
              })
          });

          if (putRes.ok) {
              alert("Le document a été sauvegardé avec succès sur GitHub !");
          } else {
              alert("Erreur lors de la sauvegarde sur GitHub (Vérifiez les droits du Token).");
          }
      } catch (e) {
          alert("Erreur réseau lors de la communication avec GitHub.");
      }
  } else {
      alert("Le fichier a été mis à jour localement uniquement.\nLa sauvegarde vers GitHub nécessite la configuration de VITE_ENCRYPTED_GITHUB_TOKEN.");
  }
});

// Utility to encrypt a new token (run this in JS console once to configure the app)
window.encryptToken = function (message, secret) {
  const encrypted = CryptoJS.AES.encrypt(message, secret).toString();
  console.log("Copiez ceci dans ENCRYPTED_GITHUB_TOKEN :", encrypted);
  return encrypted;
};

init();
