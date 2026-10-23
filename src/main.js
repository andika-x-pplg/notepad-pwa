import './styles/app.css';
import { renderHeader, getViewModeIcon } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import { renderEditorModal, renderFabAddButton } from './components/Editor.js';
import {
  renderFolderView,
  renderCreateFolderModal,
  renderPasscodeModal,
  renderTrashHeaderSubtext
} from './components/FolderModal.js';
import {
  getAllNotes,
  getTrashNotes,
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  deleteNote,
  emptyTrash,
  togglePinNote,
  exportNotesBackup,
  importNotesBackup,
  getAllCustomFolders,
  createCustomFolder,
  deleteCustomFolder,
  getSetting,
  setSetting
} from './js/db.js';

// Application State
let currentEditingId = null;
let lastSavedTitle = '';
let lastSavedContent = '';
let lastSavedCategory = 'Pribadi';
let lastSavedPinned = false;
let lastSavedFolderId = 'notes';
let lastSavedIsLocked = false;
let currentEditingCategory = 'Pribadi';
let currentEditingPinned = false;
let currentEditingFolderId = 'notes';
let currentEditingIsLocked = false;
let debounceTimer = null;
let isSaving = false;
let saveQueued = false;
let currentSavePromise = null;
let saveRevision = 0;

// Filter & Search & View Mode State
let currentSearchQuery = '';
let currentCategoryFilter = 'all'; // 'all' or category name
let currentViewMode = localStorage.getItem('notepad_view_mode') || 'card'; // 'list' | 'card' | 'grid'
let currentFolder = 'notes'; // 'notes' | 'all' | 'trash' | 'locked' | 'folder_<id>'
let cachedAllNotes = [];
let cachedCustomFolders = [];
let isPasscodeUnlocked = false; // session unlock for 'locked' folder
let passcodeSetupStep = null; // 'create' | 'confirm' | 'unlock'
let tempPasscode = '';
let enteredPin = '';

const DEBOUNCE_DELAY_MS = 500;
const CATEGORIES = ['Pribadi', 'Pekerjaan', 'Belajar', 'Ide'];

function renderOfflineBanner() {
  return `
    <div id="offlineBanner" class="offline-banner" style="display: none;" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <span>Mode Offline Aktif — Semua catatan tetap tersimpan aman di perangkat Anda.</span>
    </div>
  `;
}

function renderBackupDialog() {
  return `
    <div id="backupDialogOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box backup-modal-box" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Perlindungan & Cadangan Data</h3>
        <p class="dialog-message">Semua catatan tersimpan secara lokal di browser/perangkat Anda. Anda dapat mengekspor atau memulihkan data cadangan kapan saja.</p>
        
        <div class="security-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Penyimpanan Lokal Privat (Offline-First)
        </div>

        <div class="backup-option-card" id="exportBackupCard">
          <div class="backup-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div class="backup-info">
            <h4>Ekspor Cadangan (Download JSON)</h4>
            <p>Unduh seluruh catatan ke file JSON sebagai salinan aman.</p>
          </div>
        </div>

        <div class="backup-option-card" id="importBackupCard">
          <div class="backup-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="backup-info">
            <h4>Pulihkan Cadangan (Impor JSON)</h4>
            <p>Pilih file cadangan JSON untuk mengembalikan catatan Anda.</p>
          </div>
        </div>

        <input type="file" id="backupFileInput" accept=".json" style="display: none;" />

        <div class="dialog-actions">
          <button id="closeBackupBtn" class="btn-secondary">Tutup</button>
        </div>
      </div>
    </div>
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
 * Helper to get user-friendly title for the active folder
 */
function getActiveFolderTitle() {
  if (currentFolder === 'all') return 'Semua';
  if (currentFolder === 'trash') return 'Baru Dihapus';
  if (currentFolder === 'locked') return 'Terkunci';
  if (currentFolder === 'notes') return 'Catatan';
  if (currentFolder.startsWith('folder_')) {
    const id = Number(currentFolder.replace('folder_', ''));
    const f = cachedCustomFolders.find((item) => item.id === id);
    if (f) return f.name;
  }
  return 'Catatan';
}

function getFolderMap() {
  const map = {
    notes: 'Catatan',
    locked: 'Terkunci'
  };
  cachedCustomFolders.forEach((f) => {
    map[`folder_${f.id}`] = f.name;
  });
  return map;
}

/**
 * Filter notes based on active folder, search query, and category
 */
function getFilteredNotes() {
  let result = [...cachedAllNotes];

  // 1. Filter by Folder
  if (currentFolder === 'trash') {
    result = result.filter((n) => Boolean(n.deletedAt));
  } else {
    // Non-trash: notes that are not deleted
    result = result.filter((n) => !n.deletedAt);

    if (currentFolder === 'notes') {
      // Hanya catatan biasa (folderId === 'notes' dan bukan locked)
      result = result.filter((n) => (!n.folderId || n.folderId === 'notes') && !n.isLocked);
    } else if (currentFolder === 'locked') {
      // Folder rahasia terkunci
      result = result.filter((n) => Boolean(n.isLocked) || n.folderId === 'locked');
    } else if (currentFolder === 'all') {
      // Semua catatan (kecuali yang terkunci untuk privasi, kecuali jika sedang terbuka)
      result = result.filter((n) => !n.isLocked);
    } else if (currentFolder.startsWith('folder_')) {
      // Custom folder
      result = result.filter((n) => n.folderId === currentFolder && !n.isLocked);
    }
  }

  // 2. Filter by category
  if (currentCategoryFilter !== 'all') {
    result = result.filter((note) => {
      const noteCat = note.category || 'Pribadi';
      return noteCat.toLowerCase() === currentCategoryFilter.toLowerCase();
    });
  }

  // 3. Filter by search query (contains substring anywhere in title or content, case-insensitive)
  if (currentSearchQuery.trim() !== '') {
    const q = currentSearchQuery.trim().toLowerCase();
    result = result.filter((note) => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }

  // Sort notes: pinned notes first (if not in trash), then newest updated first
  result.sort((a, b) => {
    if (currentFolder !== 'trash') {
      const pinA = Boolean(a.isPinned);
      const pinB = Boolean(b.isPinned);
      if (pinA !== pinB) {
        return pinA ? -1 : 1;
      }
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return result;
}

async function loadAndRenderNotes() {
  const container = document.getElementById('notesContainer');
  const categoryBarContainer = document.getElementById('categoryBarContainer');
  const headerTitleText = document.getElementById('headerTitleText');
  const openEditorBtn = document.getElementById('openEditorBtn');
  const trashNoticeContainer = document.getElementById('trashNoticeContainer');
  if (!container) return;

  try {
    // Load notes (include deleted notes to calculate counts correctly)
    cachedAllNotes = await getAllNotes(true);
    cachedCustomFolders = await getAllCustomFolders();

    // Update Header Title
    const activeTitle = getActiveFolderTitle();
    if (headerTitleText) {
      headerTitleText.textContent = activeTitle;
    }

    // Toggle FAB Add Note (hide in trash view)
    if (openEditorBtn) {
      openEditorBtn.style.display = currentFolder === 'trash' ? 'none' : 'flex';
    }

    // Toggle Trash Notice Banner
    if (trashNoticeContainer) {
      if (currentFolder === 'trash') {
        trashNoticeContainer.innerHTML = renderTrashHeaderSubtext();
        trashNoticeContainer.style.display = 'block';
        bindTrashHeaderEvents();
      } else {
        trashNoticeContainer.innerHTML = '';
        trashNoticeContainer.style.display = 'none';
      }
    }

    // Render / update category filter chips with live counts
    // (Hide category bar in trash view for cleanliness)
    if (categoryBarContainer) {
      if (currentFolder === 'trash') {
        categoryBarContainer.style.display = 'none';
      } else {
        categoryBarContainer.style.display = 'block';
        const activeNotesOnly = cachedAllNotes.filter((n) => !n.deletedAt && !n.isLocked);
        categoryBarContainer.innerHTML = renderCategoryFilters(activeNotesOnly);
        bindCategoryFilterEvents();
      }
    }

    const filtered = getFilteredNotes();
    const folderMap = getFolderMap();

    container.innerHTML = renderNotesList(filtered, {
      searchQuery: currentSearchQuery,
      selectedCategory: currentCategoryFilter,
      totalRawNotes: cachedAllNotes.length,
      viewMode: currentViewMode,
      folderMap,
      currentFolder
    });

    bindNoteCardEvents();
    updateFolderPageUI();
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
  // Click on card/item to open editor (supporting .note-card, .note-list-item, .note-grid-card)
  const noteItems = document.querySelectorAll('.note-card, .note-list-item, .note-grid-card');
  noteItems.forEach((card) => {
    card.addEventListener('click', async (e) => {
      // Don't open editor if pin, restore, or delete button was clicked
      if (e.target.closest('.btn-pin-card, .btn-restore-note, .btn-permanent-delete-card')) return;

      const id = card.getAttribute('data-note-id');
      if (!id) return;

      // In trash view, clicking a card offers options to restore
      if (currentFolder === 'trash') {
        const note = await getNoteById(id);
        if (note) {
          const willRestore = confirm(`Catatan "${note.title || 'Tanpa Judul'}" ada di Baru Dihapus. Pulihkan catatan ini?`);
          if (willRestore) {
            await restoreNote(id);
            showToast('Catatan dipulihkan ke folder asalnya');
            await loadAndRenderNotes();
          }
        }
        return;
      }

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

  // Restore button directly on trash cards
  const restoreBtns = document.querySelectorAll('.btn-restore-note');
  restoreBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      try {
        await restoreNote(id);
        showToast('Catatan berhasil dipulihkan');
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal memulihkan catatan', true);
      }
    });
  });

  // Permanent Delete button directly on trash cards
  const permDeleteBtns = document.querySelectorAll('.btn-permanent-delete-card');
  permDeleteBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      const confirmed = confirm('Hapus permanen catatan ini? Tindakan tidak dapat dibatalkan.');
      if (confirmed) {
        try {
          await deleteNote(id);
          showToast('Catatan dihapus permanen');
          await loadAndRenderNotes();
        } catch (err) {
          showToast('Gagal menghapus permanen', true);
        }
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
    currentEditingFolderId = note.folderId || 'notes';
    currentEditingIsLocked = Boolean(note.isLocked);
    lastSavedCategory = currentEditingCategory;
    lastSavedPinned = currentEditingPinned;
    lastSavedFolderId = currentEditingFolderId;
    lastSavedIsLocked = currentEditingIsLocked;

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
    
    // Assign new note to current folder
    if (currentFolder === 'locked') {
      currentEditingFolderId = 'locked';
      currentEditingIsLocked = true;
    } else if (currentFolder === 'all' || currentFolder === 'trash') {
      currentEditingFolderId = 'notes';
      currentEditingIsLocked = false;
    } else {
      currentEditingFolderId = currentFolder;
      currentEditingIsLocked = false;
    }
    lastSavedFolderId = currentEditingFolderId;
    lastSavedIsLocked = currentEditingIsLocked;

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
  currentEditingFolderId = 'notes';
  currentEditingIsLocked = false;

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
    currentEditingPinned === lastSavedPinned &&
    currentEditingFolderId === lastSavedFolderId &&
    currentEditingIsLocked === lastSavedIsLocked
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
        isPinned: Boolean(currentEditingPinned),
        folderId: currentEditingFolderId || 'notes',
        isLocked: Boolean(currentEditingIsLocked)
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
      lastSavedFolderId = currentEditingFolderId;
      lastSavedIsLocked = currentEditingIsLocked;
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

  // Confirm delete note action (soft-delete to "Baru Dihapus")
  confirmDeleteBtn?.addEventListener('click', async () => {
    if (!currentEditingId) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      await softDeleteNote(currentEditingId);
      confirmOverlay?.classList.remove('active');
      showToast('Catatan dipindahkan ke Baru Dihapus');

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
      showToast(error.message || 'Gagal memindahkan ke Baru Dihapus', true);
    }
  });

  // View Mode Switcher (Tampilan Daftar, Tampilan Kartu, Tampilan Kisi)
  const viewModeBtn = document.getElementById('viewModeBtn');
  const viewModeDropdown = document.getElementById('viewModeDropdown');
  const viewModeOptions = document.querySelectorAll('.view-mode-option');
  const viewModeBtnIcon = document.getElementById('viewModeBtnIcon');

  function closeViewModeDropdown() {
    if (viewModeDropdown && viewModeDropdown.classList.contains('active')) {
      viewModeDropdown.classList.remove('active');
      viewModeDropdown.setAttribute('aria-hidden', 'true');
      viewModeBtn?.setAttribute('aria-expanded', 'false');
    }
  }

  viewModeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowActive = viewModeDropdown?.classList.toggle('active');
    viewModeDropdown?.setAttribute('aria-hidden', String(!isNowActive));
    viewModeBtn?.setAttribute('aria-expanded', String(isNowActive));
  });

  viewModeOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedMode = option.getAttribute('data-view');
      if (!selectedMode || selectedMode === currentViewMode) {
        closeViewModeDropdown();
        return;
      }

      currentViewMode = selectedMode;
      localStorage.setItem('notepad_view_mode', currentViewMode);

      // Update button icon & options active state
      if (viewModeBtnIcon) {
        viewModeBtnIcon.innerHTML = getViewModeIcon(currentViewMode);
      }
      viewModeOptions.forEach((opt) => {
        opt.classList.toggle('active', opt.getAttribute('data-view') === currentViewMode);
      });

      closeViewModeDropdown();

      // Re-render notes with selected layout
      const container = document.getElementById('notesContainer');
      if (container) {
        const filtered = getFilteredNotes();
        const folderMap = getFolderMap();
        container.innerHTML = renderNotesList(filtered, {
          searchQuery: currentSearchQuery,
          selectedCategory: currentCategoryFilter,
          totalRawNotes: cachedAllNotes.length,
          viewMode: currentViewMode,
          folderMap,
          currentFolder
        });
        bindNoteCardEvents();
      }

      const modeNames = {
        list: 'Tampilan Daftar',
        card: 'Tampilan Kartu',
        grid: 'Tampilan Kisi'
      };
      showToast(`Mengalihkan ke ${modeNames[currentViewMode] || currentViewMode}`);
    });
  });

  // Close dropdown on clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#viewModeMenuContainer')) {
      closeViewModeDropdown();
    }
  });

  // Use delegated event listener on document so clicking anywhere on the button,
  // text, or arrow always triggers open/close regardless of re-render
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#folderTitleDropdownBtn');
    if (!btn) return;
    e.stopPropagation();
    const overlay = document.getElementById('folderPageOverlay');
    if (overlay?.classList.contains('active')) {
      closeFolderPage();
    } else {
      openFolderPage();
    }
  });

  // Create Folder Modal interactions
  const createFolderOverlay = document.getElementById('createFolderOverlay');
  const cancelCreateFolderBtn = document.getElementById('cancelCreateFolderBtn');
  const saveCreateFolderBtn = document.getElementById('saveCreateFolderBtn');
  const newFolderNameInput = document.getElementById('newFolderNameInput');
  const folderPreviewCover = document.getElementById('folderPreviewCover');
  const folderPreviewLabel = document.getElementById('folderPreviewLabel');
  const coverSwatches = document.querySelectorAll('#coverSwatches .cover-swatch');

  let selectedCoverType = 'color';
  let selectedCoverValue = '#3b82f6';

  openCreateFolderBtn?.addEventListener('click', () => {
    if (newFolderNameInput) newFolderNameInput.value = '';
    if (folderPreviewLabel) folderPreviewLabel.textContent = 'FOLDER';
    selectedCoverType = 'color';
    selectedCoverValue = '#3b82f6';
    if (folderPreviewCover) {
      folderPreviewCover.style.background = '#3b82f6';
    }
    coverSwatches.forEach((sw) => {
      sw.classList.toggle('active', sw.getAttribute('data-value') === '#3b82f6');
    });
    createFolderOverlay?.classList.add('active');
    newFolderNameInput?.focus();
  });

  cancelCreateFolderBtn?.addEventListener('click', () => {
    createFolderOverlay?.classList.remove('active');
  });

  createFolderOverlay?.addEventListener('click', (e) => {
    if (e.target === createFolderOverlay) {
      createFolderOverlay.classList.remove('active');
    }
  });

  newFolderNameInput?.addEventListener('input', (e) => {
    const val = (e.target.value || '').trim().slice(0, 8);
    if (folderPreviewLabel) {
      folderPreviewLabel.textContent = val || 'FOLDER';
    }
  });

  coverSwatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      coverSwatches.forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      selectedCoverType = sw.getAttribute('data-type');
      selectedCoverValue = sw.getAttribute('data-value');
      if (folderPreviewCover) {
        if (selectedCoverType === 'gradient') {
          folderPreviewCover.style.background = selectedCoverValue;
        } else {
          folderPreviewCover.style.background = selectedCoverValue;
        }
      }
    });
  });

  saveCreateFolderBtn?.addEventListener('click', async () => {
    const name = newFolderNameInput?.value.trim();
    if (!name) {
      showToast('Masukkan nama folder', true);
      newFolderNameInput?.focus();
      return;
    }

    try {
      const newFolderId = await createCustomFolder({
        name,
        coverType: selectedCoverType,
        coverValue: selectedCoverValue
      });
      createFolderOverlay?.classList.remove('active');
      showToast(`Folder "${name}" berhasil dibuat`);

      // Switch to this new folder
      currentFolder = `folder_${newFolderId}`;
      closeFolderPage();
      await loadAndRenderNotes();
    } catch (err) {
      showToast(err.message || 'Gagal membuat folder', true);
    }
  });

  // Passcode Modal interactions
  setupPasscodeModalEvents();

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

  // Backup & Data Protection Dialog Elements
  const backupBtn = document.getElementById('backupDataBtn');
  const backupOverlay = document.getElementById('backupDialogOverlay');
  const closeBackupBtn = document.getElementById('closeBackupBtn');
  const exportCard = document.getElementById('exportBackupCard');
  const importCard = document.getElementById('importBackupCard');
  const backupFileInput = document.getElementById('backupFileInput');

  backupBtn?.addEventListener('click', () => {
    backupOverlay?.classList.add('active');
  });

  closeBackupBtn?.addEventListener('click', () => {
    backupOverlay?.classList.remove('active');
  });

  backupOverlay?.addEventListener('click', (e) => {
    if (e.target === backupOverlay) {
      backupOverlay.classList.remove('active');
    }
  });

  // Export Notes to JSON download
  exportCard?.addEventListener('click', async () => {
    try {
      const jsonContent = await exportNotesBackup();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `catatan-saya-cadangan-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Cadangan catatan berhasil diunduh');
    } catch (err) {
      showToast('Gagal mengekspor data cadangan', true);
    }
  });

  // Import Notes from JSON file
  importCard?.addEventListener('click', () => {
    backupFileInput?.click();
  });

  backupFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const result = await importNotesBackup(text);
        showToast(`Berhasil memulihkan ${result.imported} catatan!`);
        backupOverlay?.classList.remove('active');
        await loadAndRenderNotes();
      } catch (err) {
        showToast(err.message || 'Gagal memproses file cadangan', true);
      } finally {
        backupFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // Offline / Online Network Detection
  const offlineBanner = document.getElementById('offlineBanner');
  function updateNetworkStatus() {
    if (!offlineBanner) return;
    if (navigator.onLine) {
      if (offlineBanner.style.display !== 'none') {
        offlineBanner.className = 'offline-banner online';
        offlineBanner.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          <span>Koneksi Kembali Online!</span>
        `;
        setTimeout(() => {
          offlineBanner.style.display = 'none';
          offlineBanner.className = 'offline-banner';
        }, 3000);
      }
    } else {
      offlineBanner.style.display = 'flex';
      offlineBanner.className = 'offline-banner';
      offlineBanner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <span>Mode Offline Aktif — Semua catatan tetap tersimpan aman di perangkat Anda.</span>
      `;
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  if (!navigator.onLine) {
    updateNetworkStatus();
  }

  // PWA Install Prompt handling
  let deferredPrompt = null;
  const installAppBtn = document.getElementById('installAppBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent mini-infobar or default browser prompt
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) {
      installAppBtn.style.display = 'inline-flex';
    }
  });

  installAppBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('Aplikasi sudah terpasang atau browser belum siap');
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Terima kasih telah memasang Catatan Saya!');
    }
    deferredPrompt = null;
    if (installAppBtn) {
      installAppBtn.style.display = 'none';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installAppBtn) {
      installAppBtn.style.display = 'none';
    }
    showToast('Catatan Saya berhasil dipasang!');
  });
}

/**
 * Register Service Worker for PWA
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

/**
 * Check URL params for PWA shortcuts (e.g. ?action=new)
 */
function handlePwaShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    // Clean up URL parameter cleanly
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      openEditor();
    }, 200);
  }
}

function openFolderPage() {
  updateFolderPageUI();
  const overlay = document.getElementById('folderPageOverlay');
  overlay?.classList.add('active');
  overlay?.setAttribute('aria-hidden', 'false');
  const arrow = document.querySelector('.folder-arrow-icon');
  if (arrow) arrow.classList.add('open');
}

function closeFolderPage() {
  const overlay = document.getElementById('folderPageOverlay');
  overlay?.classList.remove('active');
  overlay?.setAttribute('aria-hidden', 'true');
  const arrow = document.querySelector('.folder-arrow-icon');
  if (arrow) arrow.classList.remove('open');
}

/**
 * Calculate counts and update the Folder Page Sheet DOM
 */
function updateFolderPageUI() {
  const root = document.getElementById('folderPageRoot');
  if (!root) return;

  const stats = {
    allCount: cachedAllNotes.filter((n) => !n.deletedAt && !n.isLocked).length,
    trashCount: cachedAllNotes.filter((n) => Boolean(n.deletedAt)).length,
    notesCount: cachedAllNotes.filter((n) => (!n.folderId || n.folderId === 'notes') && !n.deletedAt && !n.isLocked).length,
    lockedCount: cachedAllNotes.filter((n) => Boolean(n.isLocked) && !n.deletedAt).length
  };

  cachedCustomFolders.forEach((f) => {
    const fKey = `folder_${f.id}`;
    stats[fKey] = cachedAllNotes.filter((n) => n.folderId === fKey && !n.deletedAt && !n.isLocked).length;
  });

  // Preserve open status if it was active
  const isCurrentlyOpen = document.getElementById('folderPageOverlay')?.classList.contains('active');

  root.innerHTML = renderFolderView(stats, cachedCustomFolders);

  if (isCurrentlyOpen) {
    document.getElementById('folderPageOverlay')?.classList.add('active');
    document.querySelector('.folder-arrow-icon')?.classList.add('open');
  }

  bindFolderPageEvents();
}

/**
 * Bind click events inside Folder Page Sheet
 */
function bindFolderPageEvents() {
  const overlay = document.getElementById('folderPageOverlay');
  const closeBtn = document.getElementById('closeFolderPageBtn');
  const closeHeaderBtn = document.getElementById('closeFolderPageHeaderBtn');
  const openCreateBtn = document.getElementById('openCreateFolderBtn');

  closeBtn?.addEventListener('click', closeFolderPage);
  closeHeaderBtn?.addEventListener('click', closeFolderPage);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeFolderPage();
  });

  openCreateBtn?.addEventListener('click', () => {
    const createOverlay = document.getElementById('createFolderOverlay');
    const input = document.getElementById('newFolderNameInput');
    const previewLabel = document.getElementById('folderPreviewLabel');
    if (input) input.value = '';
    if (previewLabel) previewLabel.textContent = 'FOLDER';
    createOverlay?.classList.add('active');
    input?.focus();
  });

  // Folder Nav Rows (Semua, Baru Dihapus)
  const navRows = document.querySelectorAll('.folder-nav-row');
  navRows.forEach((row) => {
    row.addEventListener('click', async () => {
      const fId = row.getAttribute('data-folder-id');
      if (!fId) return;
      currentFolder = fId;
      closeFolderPage();
      await loadAndRenderNotes();
    });
  });

  // Folder Items (Catatan, Terkunci, Kustom Folders)
  const folderItems = document.querySelectorAll('.folder-item');
  folderItems.forEach((item) => {
    item.addEventListener('click', async (e) => {
      // Don't navigate if delete folder button was clicked
      if (e.target.closest('.btn-delete-folder')) return;

      const fId = item.getAttribute('data-folder-id');
      if (!fId) return;

      if (fId === 'locked') {
        // Open passcode modal to unlock or setup
        closeFolderPage();
        promptLockedFolderAccess();
        return;
      }

      currentFolder = fId;
      closeFolderPage();
      await loadAndRenderNotes();
    });
  });

  // Delete custom folder buttons
  const deleteFolderBtns = document.querySelectorAll('.btn-delete-folder');
  deleteFolderBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-folder-id');
      if (!id) return;

      const confirmed = confirm('Hapus folder ini? Catatan di dalamnya akan dipindahkan ke folder Catatan.');
      if (confirmed) {
        try {
          await deleteCustomFolder(id);
          showToast('Folder berhasil dihapus');
          if (currentFolder === `folder_${id}`) {
            currentFolder = 'notes';
          }
          await loadAndRenderNotes();
        } catch (err) {
          showToast('Gagal menghapus folder', true);
        }
      }
    });
  });
}

/**
 * Handle Locked Folder authentication or initial passcode setup
 */
async function promptLockedFolderAccess() {
  const savedPin = await getSetting('locked_folder_pin');
  const passcodeOverlay = document.getElementById('passcodeOverlay');
  const titleEl = document.getElementById('passcodeTitle');
  const subtextEl = document.getElementById('passcodeSubtext');

  enteredPin = '';
  updatePinDotsUI();

  if (!savedPin) {
    // First time: prompt to create a new passcode
    passcodeSetupStep = 'create';
    tempPasscode = '';
    if (titleEl) titleEl.textContent = 'Buat Kata Sandi Baru';
    if (subtextEl) subtextEl.textContent = 'Tentukan 4 angka PIN untuk mengamankan folder Terkunci.';
  } else {
    // Already set: prompt to unlock
    passcodeSetupStep = 'unlock';
    if (titleEl) titleEl.textContent = 'Buka Folder Terkunci';
    if (subtextEl) subtextEl.textContent = 'Masukkan 4 angka PIN Anda untuk membuka folder.';
  }

  passcodeOverlay?.classList.add('active');
}

function updatePinDotsUI(isError = false) {
  const dots = document.querySelectorAll('#pinDotsWrapper .pin-dot');
  dots.forEach((dot, idx) => {
    dot.className = 'pin-dot';
    if (isError) {
      dot.classList.add('error');
    } else if (idx < enteredPin.length) {
      dot.classList.add('filled');
    }
  });
}

function setupPasscodeModalEvents() {
  const keypad = document.getElementById('numericKeypad');
  const cancelBtn = document.getElementById('cancelPasscodeBtn');
  const backspaceBtn = document.getElementById('backspacePinBtn');
  const passcodeOverlay = document.getElementById('passcodeOverlay');
  const titleEl = document.getElementById('passcodeTitle');
  const subtextEl = document.getElementById('passcodeSubtext');

  function closePasscodeModal() {
    passcodeOverlay?.classList.remove('active');
    enteredPin = '';
    tempPasscode = '';
    passcodeSetupStep = null;
    updatePinDotsUI();
  }

  cancelBtn?.addEventListener('click', closePasscodeModal);

  backspaceBtn?.addEventListener('click', () => {
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDotsUI();
    }
  });

  const numBtns = keypad?.querySelectorAll('.keypad-btn[data-val]');
  numBtns?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const val = btn.getAttribute('data-val');
      if (enteredPin.length >= 4) return;
      enteredPin += val;
      updatePinDotsUI();

      if (enteredPin.length === 4) {
        // Complete 4-digit input, evaluate step
        setTimeout(async () => {
          await handlePasscodeSubmission(closePasscodeModal, titleEl, subtextEl);
        }, 150);
      }
    });
  });
}

async function handlePasscodeSubmission(closeModal, titleEl, subtextEl) {
  const savedPin = await getSetting('locked_folder_pin');

  if (passcodeSetupStep === 'create') {
    // Step 1: Save temp and ask to confirm
    tempPasscode = enteredPin;
    enteredPin = '';
    passcodeSetupStep = 'confirm';
    if (titleEl) titleEl.textContent = 'Konfirmasi Kata Sandi';
    if (subtextEl) subtextEl.textContent = 'Masukkan kembali kata sandi 4 angka yang baru dibuat.';
    updatePinDotsUI();
  } else if (passcodeSetupStep === 'confirm') {
    // Step 2: Check matching
    if (enteredPin === tempPasscode) {
      await setSetting('locked_folder_pin', enteredPin);
      showToast('Kata sandi folder berhasil dibuat!');
      isPasscodeUnlocked = true;
      currentFolder = 'locked';
      closeModal();
      await loadAndRenderNotes();
    } else {
      updatePinDotsUI(true);
      showToast('Kata sandi tidak cocok. Silakan coba lagi.', true);
      setTimeout(() => {
        enteredPin = '';
        passcodeSetupStep = 'create';
        tempPasscode = '';
        if (titleEl) titleEl.textContent = 'Buat Kata Sandi Baru';
        if (subtextEl) subtextEl.textContent = 'Tentukan 4 angka PIN untuk mengamankan folder Terkunci.';
        updatePinDotsUI();
      }, 600);
    }
  } else if (passcodeSetupStep === 'unlock') {
    // Step 3: Unlocking folder
    if (enteredPin === savedPin) {
      isPasscodeUnlocked = true;
      currentFolder = 'locked';
      closeModal();
      showToast('Folder Terkunci dibuka');
      await loadAndRenderNotes();
    } else {
      updatePinDotsUI(true);
      showToast('Kata sandi salah!', true);
      setTimeout(() => {
        enteredPin = '';
        updatePinDotsUI();
      }, 600);
    }
  }
}

/**
 * Bind Empty Trash action button
 */
function bindTrashHeaderEvents() {
  const emptyBtn = document.getElementById('emptyTrashBtn');
  emptyBtn?.addEventListener('click', async () => {
    const confirmed = confirm('Kosongkan semua catatan di Baru Dihapus? Semua catatan di sampah akan dihapus secara permanen.');
    if (confirmed) {
      try {
        const deletedCount = await emptyTrash();
        showToast(`Berhasil mengosongkan ${deletedCount} catatan dari sampah`);
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal mengosongkan sampah', true);
      }
    }
  });
}

async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderOfflineBanner()}
    ${renderHeader(currentViewMode, getActiveFolderTitle(), false)}
    <main class="app-content">
      <div id="trashNoticeContainer" style="display: none;"></div>
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
    ${renderBackupDialog()}
    <div id="folderPageRoot">
      ${renderFolderView({}, [])}
    </div>
    ${renderCreateFolderModal()}
    ${renderPasscodeModal()}
  `;

  setupInteractions();
  await loadAndRenderNotes();
  registerServiceWorker();
  handlePwaShortcuts();
}

document.addEventListener('DOMContentLoaded', initApp);


