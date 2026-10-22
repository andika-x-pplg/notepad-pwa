import './styles/app.css';
import { renderHeader } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import { renderEditorModal, renderFabAddButton } from './components/Editor.js';
import { getAllNotes, getNoteById, createNote, updateNote, deleteNote } from './js/db.js';

// State
let currentEditingId = null;

function renderConfirmDialog() {
  return `
    <div id="confirmDialogOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Hapus Catatan?</h3>
        <p class="dialog-message">Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.</p>
        <div class="dialog-actions">
          <button id="cancelDeleteBtn" class="btn-secondary">Batal</button>
          <button id="confirmDeleteBtn" class="btn-danger">Hapus</button>
        </div>
      </div>
    </div>
  `;
}

function showToast(message, isError = false) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 2400);
}

async function loadAndRenderNotes() {
  const container = document.getElementById('notesContainer');
  if (!container) return;

  try {
    const notes = await getAllNotes();
    container.innerHTML = renderNotesList(notes);
    bindNoteClickEvents();
  } catch (error) {
    console.error('Error saat merender daftar catatan:', error);
    showToast(error.message || 'Gagal memuat catatan dari database lokal', true);
  }
}

function bindNoteClickEvents() {
  const noteCards = document.querySelectorAll('.note-card');
  noteCards.forEach((card) => {
    card.addEventListener('click', async () => {
      const id = card.getAttribute('data-note-id');
      if (!id) return;

      try {
        const note = await getNoteById(id);
        if (note) {
          openEditor(note);
        } else {
          showToast('Catatan tidak ditemukan', true);
          await loadAndRenderNotes();
        }
      } catch (error) {
        showToast('Gagal memuat detail catatan', true);
      }
    });
  });
}

function openEditor(note = null) {
  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const statusText = document.getElementById('editorStatusText');
  const charCounter = document.getElementById('editorWordCount');

  if (!overlay || !titleInput || !bodyInput) return;

  if (note) {
    currentEditingId = note.id;
    titleInput.value = note.title || '';
    bodyInput.value = note.content || '';
    if (deleteBtn) deleteBtn.style.display = 'flex';
    if (statusText) statusText.textContent = 'Mode Edit • IndexedDB';
  } else {
    currentEditingId = null;
    titleInput.value = '';
    bodyInput.value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (statusText) statusText.textContent = 'Catatan Baru • IndexedDB';
  }

  if (charCounter) {
    charCounter.textContent = `${bodyInput.value.length} karakter`;
  }

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  titleInput.focus();
}

function closeEditor() {
  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');

  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  currentEditingId = null;
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  if (deleteBtn) deleteBtn.style.display = 'none';
}

function setupInteractions() {
  const overlay = document.getElementById('editorOverlay');
  const openBtn = document.getElementById('openEditorBtn');
  const closeBtn = document.getElementById('closeEditorBtn');
  const saveBtn = document.getElementById('saveNoteBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const charCounter = document.getElementById('editorWordCount');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const iconSun = document.getElementById('themeIconSun');
  const iconMoon = document.getElementById('themeIconMoon');

  // Confirmation dialog elements
  const confirmOverlay = document.getElementById('confirmDialogOverlay');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Open FAB
  openBtn?.addEventListener('click', () => openEditor());

  // Close Editor Button
  closeBtn?.addEventListener('click', closeEditor);

  // Close overlay on backdrop click
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeEditor();
    }
  });

  // Escape key to close modal or confirm dialog
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (confirmOverlay?.classList.contains('active')) {
        confirmOverlay.classList.remove('active');
        return;
      }
      if (overlay?.classList.contains('active')) {
        closeEditor();
      }
    }
  });

  // Character counter
  bodyInput?.addEventListener('input', () => {
    if (charCounter && bodyInput) {
      charCounter.textContent = `${bodyInput.value.length} karakter`;
    }
  });

  // Explicit Save action
  saveBtn?.addEventListener('click', async () => {
    const title = titleInput?.value.trim() || '';
    const content = bodyInput?.value || '';

    if (!title && !content.trim()) {
      showToast('Tulis judul atau isi catatan terlebih dahulu', true);
      titleInput?.focus();
      return;
    }

    try {
      if (currentEditingId) {
        await updateNote(currentEditingId, {
          title: title || 'Tanpa Judul',
          content
        });
        showToast('Catatan berhasil diperbarui');
      } else {
        await createNote({
          title: title || 'Tanpa Judul',
          content
        });
        showToast('Catatan baru disimpan ke IndexedDB');
      }

      closeEditor();
      await loadAndRenderNotes();
    } catch (error) {
      console.error('Error saat menyimpan catatan:', error);
      showToast(error.message || 'Gagal menyimpan catatan', true);
    }
  });

  // Open delete confirmation modal
  deleteBtn?.addEventListener('click', () => {
    if (!currentEditingId) return;
    confirmOverlay?.classList.add('active');
  });

  // Cancel deletion
  cancelDeleteBtn?.addEventListener('click', () => {
    confirmOverlay?.classList.remove('active');
  });

  confirmOverlay?.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      confirmOverlay.classList.remove('active');
    }
  });

  // Confirm delete note action
  confirmDeleteBtn?.addEventListener('click', async () => {
    if (!currentEditingId) return;

    try {
      await deleteNote(currentEditingId);
      confirmOverlay?.classList.remove('active');
      showToast('Catatan berhasil dihapus');
      closeEditor();
      await loadAndRenderNotes();
    } catch (error) {
      console.error('Error saat menghapus catatan:', error);
      showToast(error.message || 'Gagal menghapus catatan', true);
    }
  });

  // Theme switcher
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

async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderHeader()}
    <main class="app-content">
      ${renderSearchBar()}
      <div id="notesContainer">
        <!-- Loaded asynchronously from IndexedDB -->
      </div>
    </main>
    ${renderFabAddButton()}
    ${renderEditorModal()}
    ${renderConfirmDialog()}
  `;

  setupInteractions();
  await loadAndRenderNotes();
}

document.addEventListener('DOMContentLoaded', initApp);
