import Dexie from 'dexie';

/**
 * notepadDB - IndexedDB local database using Dexie
 * Database Schema:
 * notes: "++id, title, category, isPinned, createdAt, updatedAt"
 */
export const db = new Dexie('notepadDB');

db.version(1).stores({
  notes: '++id, title, category, isPinned, createdAt, updatedAt'
});

db.version(2).stores({
  notes: '++id, title, category, isPinned, folderId, deletedAt, isLocked, createdAt, updatedAt',
  folders: '++id, name, type, coverType, coverValue, createdAt, updatedAt',
  settings: 'key, value'
}).upgrade(async (tx) => {
  // Migration: default existing notes to folder 'notes' (Catatan)
  await tx.notes.toCollection().modify((note) => {
    if (!note.folderId) note.folderId = 'notes';
    if (note.deletedAt === undefined) note.deletedAt = null;
    if (note.isLocked === undefined) note.isLocked = false;
  });
});

/**
 * Validation helper for note payload
 * @param {Object} noteData
 */
function validateNotePayload(noteData, isUpdate = false) {
  if (!noteData || typeof noteData !== 'object') {
    throw new Error('Data catatan tidak valid');
  }

  if (isUpdate && (noteData.id === undefined || noteData.id === null)) {
    throw new Error('ID catatan harus disertakan untuk pembaruan');
  }

  const title = typeof noteData.title === 'string' ? noteData.title.trim() : '';
  const content = typeof noteData.content === 'string' ? noteData.content : '';

  if (!title && !content.trim()) {
    throw new Error('Judul atau isi catatan tidak boleh kosong');
  }

  return {
    title,
    content,
    category: typeof noteData.category === 'string' && noteData.category.trim() ? noteData.category.trim() : 'Pribadi',
    isPinned: Boolean(noteData.isPinned),
    folderId: noteData.folderId !== undefined ? noteData.folderId : 'notes',
    deletedAt: noteData.deletedAt !== undefined ? noteData.deletedAt : null,
    isLocked: Boolean(noteData.isLocked)
  };
}

/**
 * Get all notes from IndexedDB
 * @param {boolean} includeDeleted
 * @returns {Promise<Array>}
 */
export async function getAllNotes(includeDeleted = false) {
  try {
    let notes = await db.notes.toArray();
    if (!includeDeleted) {
      notes = notes.filter((n) => !n.deletedAt);
    }
    // Sort descending by updatedAt (newest first)
    return notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    console.error('Gagal mengambil daftar catatan:', error);
    throw new Error('Gagal memuat catatan dari database lokal.');
  }
}

/**
 * Get notes in Trash (Baru Dihapus)
 * @returns {Promise<Array>}
 */
export async function getTrashNotes() {
  try {
    const notes = await db.notes.toArray();
    return notes
      .filter((n) => Boolean(n.deletedAt))
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  } catch (error) {
    console.error('Gagal mengambil catatan di sampah:', error);
    throw new Error('Gagal memuat catatan baru dihapus.');
  }
}

/**
 * Get a single note by ID
 * @param {number|string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getNoteById(id) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }
    return await db.notes.get(numericId);
  } catch (error) {
    console.error(`Gagal mengambil catatan dengan ID ${id}:`, error);
    throw new Error('Gagal memuat detail catatan.');
  }
}

/**
 * Create and persist a new note
 * @param {Object} noteData
 * @returns {Promise<number>} Returns the auto-incremented primary key ID
 */
export async function createNote(noteData) {
  try {
    const validated = validateNotePayload(noteData, false);
    const now = Date.now();

    const newRecord = {
      ...validated,
      createdAt: now,
      updatedAt: now
    };

    return await db.transaction('rw', db.notes, async () => {
      const insertedId = await db.notes.add(newRecord);
      return insertedId;
    });
  } catch (error) {
    console.error('Gagal menyimpan catatan baru:', error);
    throw error;
  }
}

/**
 * Update an existing note
 * @param {number|string} id
 * @param {Object} updateData
 * @returns {Promise<number>} Returns 1 if updated, 0 if not found
 */
export async function updateNote(id, updateData) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }

    const validated = validateNotePayload({ ...updateData, id: numericId }, true);
    const now = Date.now();

    return await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(numericId);
      if (!existing) {
        throw new Error('Catatan tidak ditemukan untuk diperbarui');
      }

      const updatedCount = await db.notes.update(numericId, {
        title: validated.title,
        content: validated.content,
        category: validated.category || existing.category || 'Pribadi',
        isPinned: validated.isPinned !== undefined ? validated.isPinned : existing.isPinned,
        folderId: validated.folderId !== undefined ? validated.folderId : (existing.folderId || 'notes'),
        isLocked: validated.isLocked !== undefined ? validated.isLocked : Boolean(existing.isLocked),
        deletedAt: validated.deletedAt !== undefined ? validated.deletedAt : (existing.deletedAt || null),
        updatedAt: now
      });

      return updatedCount;
    });
  } catch (error) {
    console.error(`Gagal memperbarui catatan ID ${id}:`, error);
    throw error;
  }
}

/**
 * Soft-delete a note (Move to "Baru Dihapus")
 * @param {number|string} id
 */
export async function softDeleteNote(id) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }

    return await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(numericId);
      if (!existing) {
        throw new Error('Catatan tidak ditemukan untuk dihapus');
      }
      await db.notes.update(numericId, {
        deletedAt: Date.now(),
        isPinned: false
      });
    });
  } catch (error) {
    console.error(`Gagal memindahkan catatan ID ${id} ke sampah:`, error);
    throw error;
  }
}

/**
 * Restore a soft-deleted note from "Baru Dihapus"
 * @param {number|string} id
 */
export async function restoreNote(id) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }

    return await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(numericId);
      if (!existing) {
        throw new Error('Catatan tidak ditemukan');
      }
      await db.notes.update(numericId, {
        deletedAt: null,
        updatedAt: Date.now()
      });
    });
  } catch (error) {
    console.error(`Gagal memulihkan catatan ID ${id}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a note from IndexedDB
 * @param {number|string} id
 */
export async function deleteNote(id) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }

    return await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(numericId);
      if (!existing) {
        throw new Error('Catatan tidak ditemukan untuk dihapus');
      }
      await db.notes.delete(numericId);
    });
  } catch (error) {
    console.error(`Gagal menghapus permanen catatan ID ${id}:`, error);
    throw error;
  }
}

/**
 * Permanently empty all notes in trash
 */
export async function emptyTrash() {
  try {
    return await db.transaction('rw', db.notes, async () => {
      const trash = await db.notes.toArray();
      const trashIds = trash.filter((n) => Boolean(n.deletedAt)).map((n) => n.id);
      await db.notes.bulkDelete(trashIds);
      return trashIds.length;
    });
  } catch (error) {
    console.error('Gagal mengosongkan sampah:', error);
    throw error;
  }
}

/**
 * Toggle the pinned status of a note
 * @param {number|string} id
 * @returns {Promise<boolean>} returns new isPinned state
 */
export async function togglePinNote(id) {
  try {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID catatan tidak valid');
    }

    return await db.transaction('rw', db.notes, async () => {
      const existing = await db.notes.get(numericId);
      if (!existing) {
        throw new Error('Catatan tidak ditemukan');
      }
      const newPinned = !existing.isPinned;
      await db.notes.update(numericId, {
        isPinned: newPinned
      });
      return newPinned;
    });
  } catch (error) {
    console.error(`Gagal mengubah status pin catatan ID ${id}:`, error);
    throw error;
  }
}

// ==========================================
// FOLDER CRUD & SETTINGS
// ==========================================

export async function getAllCustomFolders() {
  try {
    return await db.folders.toArray();
  } catch (error) {
    console.error('Gagal mengambil folder kustom:', error);
    return [];
  }
}

export async function createCustomFolder({ name, coverType = 'color', coverValue = '#3b82f6' }) {
  try {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Nama folder tidak boleh kosong');
    }
    const now = Date.now();
    const folderRecord = {
      name: trimmed,
      coverType, // 'color' | 'gradient' | 'template'
      coverValue,
      createdAt: now,
      updatedAt: now
    };
    return await db.folders.add(folderRecord);
  } catch (error) {
    console.error('Gagal membuat folder baru:', error);
    throw error;
  }
}

export async function deleteCustomFolder(id) {
  try {
    const numericId = Number(id);
    return await db.transaction('rw', db.folders, db.notes, async () => {
      await db.folders.delete(numericId);
      // Reassign any notes in this folder back to default 'notes'
      const folderKey = `folder_${numericId}`;
      const notesInFolder = await db.notes.where('folderId').equals(folderKey).toArray();
      for (const n of notesInFolder) {
        await db.notes.update(n.id, { folderId: 'notes' });
      }
    });
  } catch (error) {
    console.error('Gagal menghapus folder:', error);
    throw error;
  }
}

// App Settings (Lock Passcode)
export async function getSetting(key) {
  try {
    const item = await db.settings.get(key);
    return item ? item.value : null;
  } catch (e) {
    return null;
  }
}

export async function setSetting(key, value) {
  try {
    await db.settings.put({ key, value });
  } catch (e) {
    console.error('Gagal menyimpan pengaturan:', e);
  }
}

/**
 * Export all notes as a JSON string for offline backup / data protection
 * @returns {Promise<string>}
 */
export async function exportNotesBackup() {
  try {
    const allNotes = await db.notes.toArray();
    const backupData = {
      app: 'Catatan Saya PWA',
      version: 1,
      exportedAt: new Date().toISOString(),
      totalNotes: allNotes.length,
      notes: allNotes
    };
    return JSON.stringify(backupData, null, 2);
  } catch (error) {
    console.error('Gagal mengekspor cadangan catatan:', error);
    throw new Error('Gagal mengekspor data catatan.');
  }
}

/**
 * Import notes from a backup JSON string or object
 * @param {string|Object} rawBackup
 * @returns {Promise<{imported: number, skipped: number}>}
 */
export async function importNotesBackup(rawBackup) {
  try {
    let parsed = typeof rawBackup === 'string' ? JSON.parse(rawBackup) : rawBackup;
    if (!parsed || !Array.isArray(parsed.notes)) {
      throw new Error('Format file cadangan tidak valid (harus berisi array catatan).');
    }

    let importedCount = 0;
    let skippedCount = 0;

    await db.transaction('rw', db.notes, async () => {
      for (const item of parsed.notes) {
        if (!item || typeof item !== 'object') {
          skippedCount++;
          continue;
        }

        const title = (item.title || '').trim();
        const content = typeof item.content === 'string' ? item.content : '';

        if (!title && !content.trim()) {
          skippedCount++;
          continue;
        }

        const record = {
          title: title || 'Tanpa Judul',
          content: content,
          category: item.category || 'Pribadi',
          isPinned: Boolean(item.isPinned),
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now()
        };

        await db.notes.add(record);
        importedCount++;
      }
    });

    return { imported: importedCount, skipped: skippedCount };
  } catch (error) {
    console.error('Gagal memulihkan cadangan:', error);
    throw error;
  }
}

