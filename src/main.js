import './styles/app.css';
import { renderHeader } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import { renderEditorModal, renderFabAddButton } from './components/Editor.js';
import { getAllNotes, getNoteById, createNote, updateNote, deleteNote } from './js/db.js';

// Application State
let currentEditingId = null;
let lastSavedTitle = '';
let lastSavedContent = '';
let debounceTimer = null;
let isSaving = false;
let saveQueued = false;
let currentSavePromise = null;
let saveRevision = 0;

const DEBOUNCE_DELAY_MS = 500;

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

/**
 * Set the autosave status label and visual indicator
 * @param {'idle'|'editing'|'saving'|'saved'|'error'} state
 * @param {string} [customMessage]
 */
function setSavingStatus(state, customMessage) {
  const badge = document.getElementById('editorStatusBadge');
  const textEl = document.getElementById('editorStatusText');
  const retryBtn = document.getElementById('retrySaveBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');

  if (!badge || !textEl) return;

  badge.className = `status-badge status-${state}`;

  if (retryBtn) {
    retryBtn.style.display = state === 'error' ? 'inline-flex' : 'none';
  }

  // Guard destructive button while active save is in-flight
  if (deleteBtn && currentEditingId) {
    deleteBtn.disabled = state === 'saving';
    deleteBtn.style.opacity = state === 'saving' ? '0.5' : '1';
    deleteBtn.style.pointerEvents = state === 'saving' ? 'none' : 'auto';
  }

  switch (state) {
    case 'editing':
      textEl.textContent = customMessage || 'Mengedit…';
      break;
    case 'saving':
      textEl.textContent = customMessage || 'Menyimpan…';
      break;
    case 'saved':
      textEl.textContent = customMessage || 'Tersimpan';
      break;
    case 'error':
      textEl.textContent = customMessage || 'Gagal menyimpan';
      break;
    case 'idle':
    default:
      textEl.textContent = customMessage || (currentEditingId ? 'Tersimpan' : 'Siap');
      break;
  }
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

      // If user clicks another note while pending changes exist in current note, flush first
      if (overlayIsOpen()) {
        await flushPendingSave();
      }

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

function overlayIsOpen() {
  const overlay = document.getElementById('editorOverlay');
  return overlay?.classList.contains('active');
}

function openEditor(note = null) {
  // Clear any existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const charCounter = document.getElementById('editorWordCount');

  if (!overlay || !titleInput || !bodyInput) return;

  if (note) {
    currentEditingId = note.id;
    lastSavedTitle = note.title || '';
    lastSavedContent = note.content || '';
    titleInput.value = lastSavedTitle;
    bodyInput.value = lastSavedContent;
    if (deleteBtn) deleteBtn.style.display = 'flex';
    setSavingStatus('idle', 'Tersimpan');
  } else {
    currentEditingId = null;
    lastSavedTitle = '';
    lastSavedContent = '';
    titleInput.value = '';
    bodyInput.value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    setSavingStatus('idle', 'Siap');
  }

  if (charCounter) {
    charCounter.textContent = `${bodyInput.value.length} karakter`;
  }

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  titleInput.focus();
}

async function closeEditor() {
  // Flush any pending changes before closing
  await flushPendingSave();

  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');

  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  currentEditingId = null;
  lastSavedTitle = '';
  lastSavedContent = '';

  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  if (deleteBtn) deleteBtn.style.display = 'none';
  setSavingStatus('idle', 'Siap');
}

/**
 * Trigger debounced autosave upon title or body input
 */
function handleEditorInput() {
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const charCounter = document.getElementById('editorWordCount');

  if (!titleInput || !bodyInput) return;

  if (charCounter) {
    charCounter.textContent = `${bodyInput.value.length} karakter`;
  }

  const currentTitle = titleInput.value;
  const currentContent = bodyInput.value;

  // Check if content differs from last saved state
  if (currentTitle === lastSavedTitle && currentContent === lastSavedContent) {
    return;
  }

  setSavingStatus('editing', 'Mengedit…');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    performSave();
  }, DEBOUNCE_DELAY_MS);
}

/**
 * Execute save operation safely against IndexedDB
 * Handles race conditions, revision counters, and error states
 */
async function performSave() {
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (!titleInput || !bodyInput) return;

  const currentTitle = titleInput.value.trim();
  const currentContent = bodyInput.value;

  // Rule: Do not create blank notes if both title and content are empty
  if (!currentTitle && !currentContent.trim()) {
    if (!currentEditingId) {
      // It's a new empty note, remain idle
      setSavingStatus('idle', 'Siap');
      return;
    }
  }

  // Check if nothing changed compared to last saved
  if (currentTitle === lastSavedTitle && currentContent === lastSavedContent) {
    setSavingStatus('saved', 'Tersimpan');
    return;
  }

  // If a save is already in-flight, queue next save run
  if (isSaving) {
    saveQueued = true;
    return;
  }

  isSaving = true;
  saveQueued = false;
  const thisRevision = ++saveRevision;
  setSavingStatus('saving', 'Menyimpan…');

  try {
    currentSavePromise = (async () => {
      if (currentEditingId) {
        // Updating existing note
        await updateNote(currentEditingId, {
          title: currentTitle || 'Tanpa Judul',
          content: currentContent
        });
      } else {
        // Creating new note
        const newId = await createNote({
          title: currentTitle || 'Tanpa Judul',
          content: currentContent
        });
        currentEditingId = newId;

        // Reveal delete button now that note exists in database
        const deleteBtn = document.getElementById('deleteNoteBtn');
        if (deleteBtn) deleteBtn.style.display = 'flex';
      }
    })();

    await currentSavePromise;

    // Only update saved snapshot and UI if this was the latest revision
    if (thisRevision === saveRevision) {
      lastSavedTitle = currentTitle;
      lastSavedContent = currentContent;
      setSavingStatus('saved', 'Tersimpan');
      await loadAndRenderNotes();
    }
  } catch (error) {
    console.error('Autosave error:', error);
    // Preserve user text in input, show failed status and allow retry
    setSavingStatus('error', 'Gagal menyimpan');
    showToast('Gagal menyimpan otomatis. Ketuk "Coba lagi" untuk mencoba ulang.', true);
  } finally {
    isSaving = false;
    currentSavePromise = null;

    // If another change came in while this save was executing, run it now
    if (saveQueued) {
      saveQueued = false;
      performSave();
    }
  }
}

/**
 * Flush any pending debounce or queued save immediately
 */
async function flushPendingSave() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // If there are unsaved changes, run save immediately
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (titleInput && bodyInput) {
    const curTitle = titleInput.value.trim();
    const curContent = bodyInput.value;
    if (curTitle !== lastSavedTitle || curContent !== lastSavedContent) {
      await performSave();
    }
  }

  // If currently saving, wait for completion
  if (currentSavePromise) {
    try {
      await currentSavePromise;
    } catch (_) {
      // Handled in performSave
    }
  }
}

function setupInteractions() {
  const overlay = document.getElementById('editorOverlay');
  const openBtn = document.getElementById('openEditorBtn');
  const closeBtn = document.getElementById('closeEditorBtn');
  const saveBtn = document.getElementById('saveNoteBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const retryBtn = document.getElementById('retrySaveBtn');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
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
  window.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      if (confirmOverlay?.classList.contains('active')) {
        confirmOverlay.classList.remove('active');
        return;
      }
      if (overlay?.classList.contains('active')) {
        await closeEditor();
      }
    }
  });

  // Debounced input listeners
  titleInput?.addEventListener('input', handleEditorInput);
  bodyInput?.addEventListener('input', handleEditorInput);

  // Explicit Save button triggers immediate flush & save
  saveBtn?.addEventListener('click', async () => {
    await flushPendingSave();
    const badge = document.getElementById('editorStatusBadge');
    if (!badge?.classList.contains('status-error')) {
      showToast('Catatan tersimpan');
    }
  });

  // Retry save button when save failed
  retryBtn?.addEventListener('click', () => {
    performSave();
  });

  // Open delete confirmation modal (guarded if currently saving)
  deleteBtn?.addEventListener('click', () => {
    if (!currentEditingId || isSaving) return;
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

    // Cancel any active debounce timers
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      await deleteNote(currentEditingId);
      confirmOverlay?.classList.remove('active');
      showToast('Catatan berhasil dihapus');
      
      // Close editor without re-saving
      const overlayEl = document.getElementById('editorOverlay');
      if (overlayEl) {
        overlayEl.classList.remove('active');
        overlayEl.setAttribute('aria-hidden', 'true');
      }
      currentEditingId = null;
      lastSavedTitle = '';
      lastSavedContent = '';
      if (titleInput) titleInput.value = '';
      if (bodyInput) bodyInput.value = '';
      if (deleteBtn) deleteBtn.style.display = 'none';

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
