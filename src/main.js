import './styles/app.css';
import { renderHeader } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import { renderEditorModal, renderFabAddButton } from './components/Editor.js';
import { getAllNotes, getNoteById, createNote, updateNote, deleteNote, togglePinNote } from './js/db.js';

// Application State
let currentEditingId = null;
let lastSavedTitle = '';
let lastSavedContent = '';
let lastSavedCategory = 'Pribadi';
let lastSavedPinned = false;
let currentEditingCategory = 'Pribadi';
let currentEditingPinned = false;
let debounceTimer = null;
let isSaving = false;
let saveQueued = false;
let currentSavePromise = null;
let saveRevision = 0;

// Filter & Search State
let currentSearchQuery = '';
let currentCategoryFilter = 'all'; // 'all' or category name
let cachedAllNotes = [];

const DEBOUNCE_DELAY_MS = 500;
const CATEGORIES = ['Pribadi', 'Pekerjaan', 'Belajar', 'Ide'];

function renderCategoryFilters(notes = []) {
  const counts = {
    all: notes.length,
    Pribadi: 0,
    Pekerjaan: 0,
    Belajar: 0,
    Ide: 0
  };

  notes.forEach((n) => {
    const cat = n.category || 'Pribadi';
    if (counts[cat] !== undefined) {
      counts[cat]++;
    } else {
      counts['Pribadi']++;
    }
  });

  return `
    <nav class="category-filter-bar" aria-label="Filter Kategori">
      <button class="category-filter-chip ${currentCategoryFilter === 'all' ? 'active' : ''}" data-category="all">
        Semua
        <span class="chip-badge">${counts.all}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Pribadi' ? 'active' : ''}" data-category="Pribadi">
        <span class="category-dot cat-pribadi"></span>
        Pribadi
        <span class="chip-badge">${counts.Pribadi}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Pekerjaan' ? 'active' : ''}" data-category="Pekerjaan">
        <span class="category-dot cat-pekerjaan"></span>
        Pekerjaan
        <span class="chip-badge">${counts.Pekerjaan}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Belajar' ? 'active' : ''}" data-category="Belajar">
        <span class="category-dot cat-belajar"></span>
        Belajar
        <span class="chip-badge">${counts.Belajar}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Ide' ? 'active' : ''}" data-category="Ide">
        <span class="category-dot cat-ide"></span>
        Ide
        <span class="chip-badge">${counts.Ide}</span>
      </button>
    </nav>
  `;
}

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

/**
 * Filter notes based on current search query and category
 * Case-insensitive search anywhere in title or content (front, middle, back)
 */
function getFilteredNotes() {
  let result = [...cachedAllNotes];

  // 1. Filter by category
  if (currentCategoryFilter !== 'all') {
    result = result.filter((note) => {
      const noteCat = note.category || 'Pribadi';
      return noteCat.toLowerCase() === currentCategoryFilter.toLowerCase();
    });
  }

  // 2. Filter by search query (contains substring anywhere in title or content, case-insensitive)
  if (currentSearchQuery.trim() !== '') {
    const q = currentSearchQuery.trim().toLowerCase();
    result = result.filter((note) => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }

  // Sort notes: pinned notes first, then newest updated first
  result.sort((a, b) => {
    const pinA = Boolean(a.isPinned);
    const pinB = Boolean(b.isPinned);
    if (pinA !== pinB) {
      return pinA ? -1 : 1;
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return result;
}

async function loadAndRenderNotes() {
  const container = document.getElementById('notesContainer');
  const categoryBarContainer = document.getElementById('categoryBarContainer');
  if (!container) return;

  try {
    cachedAllNotes = await getAllNotes();

    // Render / update category filter chips with live counts
    if (categoryBarContainer) {
      categoryBarContainer.innerHTML = renderCategoryFilters(cachedAllNotes);
      bindCategoryFilterEvents();
    }

    const filtered = getFilteredNotes();
    container.innerHTML = renderNotesList(filtered, {
      searchQuery: currentSearchQuery,
      selectedCategory: currentCategoryFilter,
      totalRawNotes: cachedAllNotes.length
    });

    bindNoteCardEvents();
  } catch (error) {
    console.error('Error saat merender daftar catatan:', error);
    showToast(error.message || 'Gagal memuat catatan dari database lokal', true);
  }
}

function bindCategoryFilterEvents() {
  const chips = document.querySelectorAll('.category-filter-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-category');
      if (currentCategoryFilter === cat) return;
      currentCategoryFilter = cat;
      loadAndRenderNotes();
    });
  });
}

function bindNoteCardEvents() {
  // Click on card to open editor
  const noteCards = document.querySelectorAll('.note-card');
  noteCards.forEach((card) => {
    card.addEventListener('click', async (e) => {
      // Don't open editor if pin button was clicked
      if (e.target.closest('.btn-pin-card')) return;

      const id = card.getAttribute('data-note-id');
      if (!id) return;

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

  // Pin button directly on cards
  const pinBtns = document.querySelectorAll('.btn-pin-card');
  pinBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      try {
        const isPinned = await togglePinNote(id);
        showToast(isPinned ? 'Catatan disematkan ke atas' : 'Sematan catatan dilepas');
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal mengubah status pin', true);
      }
    });
  });

  // Reset search button inside empty-search state
  const resetSearchBtn = document.getElementById('resetSearchBtn');
  resetSearchBtn?.addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    currentSearchQuery = '';
    loadAndRenderNotes();
  });

  // Reset category button inside empty category state
  const resetCategoryBtn = document.getElementById('resetCategoryBtn');
  resetCategoryBtn?.addEventListener('click', () => {
    currentCategoryFilter = 'all';
    loadAndRenderNotes();
  });
}

function overlayIsOpen() {
  const overlay = document.getElementById('editorOverlay');
  return overlay?.classList.contains('active');
}

function updateEditorCategoryUI(selectedCategory) {
  currentEditingCategory = selectedCategory || 'Pribadi';
  const buttons = document.querySelectorAll('#editorCategoryPills .category-pill-btn');
  buttons.forEach((btn) => {
    const cat = btn.getAttribute('data-category');
    if (cat.toLowerCase() === currentEditingCategory.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateEditorPinUI(isPinned) {
  currentEditingPinned = Boolean(isPinned);
  const pinBtn = document.getElementById('editorPinBtn');
  if (pinBtn) {
    if (currentEditingPinned) {
      pinBtn.classList.add('active');
      pinBtn.title = 'Lepas sematan (Pinned)';
    } else {
      pinBtn.classList.remove('active');
      pinBtn.title = 'Sematkan catatan (Pin)';
    }
  }
}

function openEditor(note = null) {
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
    currentEditingCategory = note.category || 'Pribadi';
    currentEditingPinned = Boolean(note.isPinned);
    lastSavedCategory = currentEditingCategory;
    lastSavedPinned = currentEditingPinned;

    titleInput.value = lastSavedTitle;
    bodyInput.value = lastSavedContent;
    if (deleteBtn) deleteBtn.style.display = 'flex';
    setSavingStatus('idle', 'Tersimpan');
  } else {
    currentEditingId = null;
    lastSavedTitle = '';
    lastSavedContent = '';
    lastSavedCategory = currentCategoryFilter !== 'all' ? currentCategoryFilter : 'Pribadi';
    lastSavedPinned = false;
    currentEditingCategory = lastSavedCategory;
    currentEditingPinned = false;

    titleInput.value = '';
    bodyInput.value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    setSavingStatus('idle', 'Siap');
  }

  updateEditorCategoryUI(currentEditingCategory);
  updateEditorPinUI(currentEditingPinned);

  if (charCounter) {
    charCounter.textContent = `${bodyInput.value.length} karakter`;
  }

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  titleInput.focus();
}

async function closeEditor() {
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
  lastSavedCategory = 'Pribadi';
  lastSavedPinned = false;
  currentEditingCategory = 'Pribadi';
  currentEditingPinned = false;

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

  if (
    currentTitle === lastSavedTitle &&
    currentContent === lastSavedContent &&
    currentEditingCategory === lastSavedCategory &&
    currentEditingPinned === lastSavedPinned
  ) {
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
 */
async function performSave() {
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (!titleInput || !bodyInput) return;

  const currentTitle = titleInput.value.trim();
  const currentContent = bodyInput.value;

  // Do not create blank notes if both title and content are empty
  if (!currentTitle && !currentContent.trim()) {
    if (!currentEditingId) {
      setSavingStatus('idle', 'Siap');
      return;
    }
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
      const payload = {
        title: currentTitle || 'Tanpa Judul',
        content: currentContent,
        category: currentEditingCategory || 'Pribadi',
        isPinned: Boolean(currentEditingPinned)
      };

      if (currentEditingId) {
        await updateNote(currentEditingId, payload);
      } else {
        const newId = await createNote(payload);
        currentEditingId = newId;

        const deleteBtn = document.getElementById('deleteNoteBtn');
        if (deleteBtn) deleteBtn.style.display = 'flex';
      }
    })();

    await currentSavePromise;

    if (thisRevision === saveRevision) {
      lastSavedTitle = currentTitle;
      lastSavedContent = currentContent;
      lastSavedCategory = currentEditingCategory;
      lastSavedPinned = currentEditingPinned;
      setSavingStatus('saved', 'Tersimpan');
      await loadAndRenderNotes();
    }
  } catch (error) {
    console.error('Autosave error:', error);
    setSavingStatus('error', 'Gagal menyimpan');
    showToast('Gagal menyimpan otomatis. Ketuk "Coba lagi" untuk mencoba ulang.', true);
  } finally {
    isSaving = false;
    currentSavePromise = null;

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

  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (titleInput && bodyInput) {
    const curTitle = titleInput.value.trim();
    const curContent = bodyInput.value;
    if (
      curTitle !== lastSavedTitle ||
      curContent !== lastSavedContent ||
      currentEditingCategory !== lastSavedCategory ||
      currentEditingPinned !== lastSavedPinned
    ) {
      await performSave();
    }
  }

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
  const editorPinBtn = document.getElementById('editorPinBtn');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const iconSun = document.getElementById('themeIconSun');
  const iconMoon = document.getElementById('themeIconMoon');

  // Confirmation dialog elements
  const confirmOverlay = document.getElementById('confirmDialogOverlay');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Search Input Interaction
  searchInput?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    if (clearSearchBtn) {
      clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
    }
    loadAndRenderNotes();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    clearSearchBtn.style.display = 'none';
    currentSearchQuery = '';
    loadAndRenderNotes();
  });

  // Editor Category Selector Pills interaction
  const editorPills = document.querySelectorAll('#editorCategoryPills .category-pill-btn');
  editorPills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      const selectedCat = pill.getAttribute('data-category');
      updateEditorCategoryUI(selectedCat);
      const curTitle = titleInput?.value.trim() || '';
      const curContent = bodyInput?.value.trim() || '';
      if (currentEditingId || curTitle || curContent) {
        await performSave();
      }
    });
  });

  // Editor Pin Button toggle
  editorPinBtn?.addEventListener('click', async () => {
    updateEditorPinUI(!currentEditingPinned);
    showToast(currentEditingPinned ? 'Catatan disematkan' : 'Sematan dilepas');
    const curTitle = titleInput?.value.trim() || '';
    const curContent = bodyInput?.value.trim() || '';
    if (currentEditingId || curTitle || curContent) {
      await performSave();
    }
  });

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

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      await deleteNote(currentEditingId);
      confirmOverlay?.classList.remove('active');
      showToast('Catatan berhasil dihapus');

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
      <div id="categoryBarContainer">
        <!-- Rendered dynamically with note counts -->
      </div>
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

