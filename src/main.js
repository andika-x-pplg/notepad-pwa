import './styles/app.css';
import { renderHeader } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import { renderEditorModal, renderFabAddButton } from './components/Editor.js';

// Sample initial data for UI preview
let sampleNotes = [
  {
    id: '1',
    title: 'Rencana Pengembangan PWA',
    content: 'Tahap 1 fokus pada fondasi UI responsif, struktur komponen bersih, dan tema terang/gelap.',
    updatedAt: 'Hari ini, 10:30'
  },
  {
    id: '2',
    title: 'Daftar Belanja & Kebutuhan',
    content: 'Kopi biji robusta, susu gandum, buku catatan saku, dan pulpen gel hitam.',
    updatedAt: 'Kemarin'
  }
];

function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  // Mount UI Components
  app.innerHTML = `
    ${renderHeader()}
    <main class="app-content">
      ${renderSearchBar()}
      <div id="notesContainer">
        ${renderNotesList(sampleNotes)}
      </div>
    </main>
    ${renderFabAddButton()}
    ${renderEditorModal()}
  `;

  setupInteractions();
}

function setupInteractions() {
  const overlay = document.getElementById('editorOverlay');
  const openBtn = document.getElementById('openEditorBtn');
  const closeBtn = document.getElementById('closeEditorBtn');
  const saveBtn = document.getElementById('saveNoteBtn');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const charCounter = document.getElementById('editorWordCount');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const iconSun = document.getElementById('themeIconSun');
  const iconMoon = document.getElementById('themeIconMoon');

  // Open Editor
  function openEditor(title = '', content = '') {
    if (!overlay || !titleInput || !bodyInput) return;
    titleInput.value = title;
    bodyInput.value = content;
    updateCounter();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    titleInput.focus();
  }

  // Close Editor
  function closeEditor() {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (titleInput) titleInput.value = '';
    if (bodyInput) bodyInput.value = '';
    updateCounter();
  }

  function updateCounter() {
    if (!charCounter || !bodyInput) return;
    const len = bodyInput.value.length;
    charCounter.textContent = `${len} karakter`;
  }

  // Event Listeners for Editor
  openBtn?.addEventListener('click', () => openEditor());
  closeBtn?.addEventListener('click', closeEditor);

  // Close when clicking overlay backdrop
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeEditor();
    }
  });

  // Escape key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay?.classList.contains('active')) {
      closeEditor();
    }
  });

  // Character counter
  bodyInput?.addEventListener('input', updateCounter);

  // Save interaction (UI only for Phase 1)
  saveBtn?.addEventListener('click', () => {
    const title = titleInput?.value.trim();
    const content = bodyInput?.value.trim();

    if (title || content) {
      sampleNotes.unshift({
        id: Date.now().toString(),
        title: title || 'Tanpa Judul',
        content: content || 'Tidak ada teks tambahan...',
        updatedAt: 'Baru saja'
      });
      const container = document.getElementById('notesContainer');
      if (container) {
        container.innerHTML = renderNotesList(sampleNotes);
        bindNoteClickEvents();
      }
    }
    closeEditor();
  });

  function bindNoteClickEvents() {
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-note-id');
        const note = sampleNotes.find((n) => n.id === id);
        if (note) {
          openEditor(note.title, note.content);
        }
      });
    });
  }

  bindNoteClickEvents();

  // Dark/Light Theme Switcher using CSS Variables
  let isDark = false;
  themeToggleBtn?.addEventListener('click', () => {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (iconSun && iconMoon) {
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (iconSun && iconMoon) {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
      }
    }
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
