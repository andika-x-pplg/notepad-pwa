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
  };
}

/**
 * Get all notes from IndexedDB, ordered by updatedAt descending
 * @returns {Promise<Array>}
 */
export async function getAllNotes() {
  try {
    const notes = await db.notes.toArray();
    // Sort descending by updatedAt (newest first)
    return notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    console.error('Gagal mengambil daftar catatan:', error);
    throw new Error('Gagal memuat catatan dari database lokal.');
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

/**
 * Delete a note by ID
 * @param {number|string} id
 * @returns {Promise<void>}
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
    console.error(`Gagal menghapus catatan ID ${id}:`, error);
    throw error;
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

