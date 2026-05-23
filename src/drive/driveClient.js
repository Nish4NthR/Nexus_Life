/**
 * driveClient — Google Drive API wrapper for NexusLife.
 *
 * Stores all data files inside a single folder named "NexusLife" in the user's Drive.
 * Uses the `drive.file` scope so we only see files our app created.
 *
 * Requires an OAuth access token (managed by useGoogleAuth.js / driveStore).
 */

const FOLDER_NAME = 'NexusLife';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_MIME = 'application/json';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  constructor(message, { status, filename, cause } = {}) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
    this.filename = filename;
    this.cause = cause;
  }
}

let _tokenProvider = null;

/**
 * Inject a function that returns the current OAuth access token.
 * Called once at app startup by the auth bootstrap.
 */
export function setTokenProvider(fn) {
  _tokenProvider = fn;
}

function getToken() {
  if (!_tokenProvider) {
    throw new DriveError('Drive token provider not set — call setTokenProvider() first');
  }
  const token = _tokenProvider();
  if (!token) {
    throw new DriveError('Not signed in to Google Drive');
  }
  return token;
}

async function gfetch(url, init = {}) {
  const token = getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  return res;
}

// -------------------- folder + file lookups --------------------

let _folderId = null;
const _fileIdCache = new Map(); // filename → fileId

/**
 * Find or create the NexusLife folder in the user's Drive.
 * Returns the folder ID, cached for the session.
 */
async function ensureFolder() {
  if (_folderId) return _folderId;

  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`
  );
  const res = await gfetch(`${DRIVE}/files?q=${q}&fields=files(id,name)&spaces=drive`);
  if (!res.ok) {
    throw new DriveError(`folder lookup failed: ${res.status}`, { status: res.status });
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    _folderId = data.files[0].id;
    return _folderId;
  }

  // Create it
  const createRes = await gfetch(`${DRIVE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: FOLDER_MIME,
    }),
  });
  if (!createRes.ok) {
    throw new DriveError(`folder create failed: ${createRes.status}`, {
      status: createRes.status,
    });
  }
  const created = await createRes.json();
  _folderId = created.id;
  return _folderId;
}

async function findFile(filename) {
  if (_fileIdCache.has(filename)) return _fileIdCache.get(filename);

  const folderId = await ensureFolder();
  const q = encodeURIComponent(
    `name='${filename}' and '${folderId}' in parents and trashed=false`
  );
  const res = await gfetch(`${DRIVE}/files?q=${q}&fields=files(id,name)&spaces=drive`);
  if (!res.ok) {
    throw new DriveError(`file lookup failed for ${filename}: ${res.status}`, {
      status: res.status,
      filename,
    });
  }
  const data = await res.json();
  const file = data.files && data.files[0];
  if (file) {
    _fileIdCache.set(filename, file.id);
    return file.id;
  }
  return null;
}

/**
 * Create a new file in the NexusLife folder with the given JSON content.
 * Uses multipart upload (metadata + content in one request).
 */
async function createFile(filename, data) {
  const folderId = await ensureFolder();
  const boundary = '-------nexuslife-' + Math.random().toString(36).slice(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    mimeType: JSON_MIME,
    parents: [folderId],
  };

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${JSON_MIME}\r\n\r\n` +
    JSON.stringify(data, null, 2) +
    closeDelim;

  const res = await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new DriveError(`create ${filename} failed: ${res.status} ${detail}`, {
      status: res.status,
      filename,
    });
  }

  const created = await res.json();
  _fileIdCache.set(filename, created.id);
  return created.id;
}

async function updateFileContent(fileId, data, filename) {
  const res = await gfetch(`${UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify(data, null, 2),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new DriveError(`update ${filename} failed: ${res.status} ${detail}`, {
      status: res.status,
      filename,
    });
  }
  return res.json().catch(() => ({ ok: true }));
}

// -------------------- public API --------------------

export async function readJSON(filename, fallback = null) {
  try {
    const fileId = await findFile(filename);
    if (!fileId) return fallback;

    const res = await gfetch(`${DRIVE}/files/${fileId}?alt=media`);
    if (!res.ok) {
      throw new DriveError(`read ${filename} failed: ${res.status}`, {
        status: res.status,
        filename,
      });
    }
    const text = await res.text();
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new DriveError(`invalid JSON in ${filename}`, {
        status: 200,
        filename,
        cause: parseErr,
      });
    }
  } catch (err) {
    if (err instanceof DriveError) throw err;
    throw new DriveError(`network error reading ${filename}`, {
      filename,
      cause: err,
    });
  }
}

export async function writeJSON(filename, data) {
  try {
    const fileId = await findFile(filename);
    if (fileId) {
      await updateFileContent(fileId, data, filename);
    } else {
      await createFile(filename, data);
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof DriveError) throw err;
    throw new DriveError(`network error writing ${filename}`, {
      filename,
      cause: err,
    });
  }
}

export async function updateJSON(filename, updater, fallback = []) {
  const current = await readJSON(filename, fallback);
  const next = updater(current ?? fallback);
  await writeJSON(filename, next);
  return next;
}

/**
 * Wipe in-memory caches — call on sign-out so the next session starts fresh.
 */
export function resetDriveCache() {
  _folderId = null;
  _fileIdCache.clear();
}

export const FILES = Object.freeze({
  habits: 'habits.json',
  habitLogs: 'habit-logs.json',
  badHabits: 'bad-habits.json',
  expenses: 'expenses.json',
  budgets: 'budgets.json',
  goals: 'goals.json',
  moods: 'moods.json',
  journal: 'journal.json',
  profile: 'profile.json',
  learning: 'learning.json',
  learningLogs: 'learning-logs.json',
  smsQueue: 'sms-queue.json',
});

// Backwards-compatible alias so existing imports keep working
export { DriveError as GCSError };
