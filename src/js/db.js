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
