import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// Photos live in the app's own sandboxed document directory (private per-app storage on both iOS and Android).
const EVIDENCE_DIR = `${FileSystem.documentDirectory}mistake-evidence/`;
const QUEUE_KEY = 'psle_local_mistake_evidence_v1';
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.6;

async function ensureEvidenceDir() {
  const info = await FileSystem.getInfoAsync(EVIDENCE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
}

// Resizes and re-encodes the transient camera image before moving it into durable app storage.
export async function saveImageToAppStorage(sourceUri, width, height) {
  await ensureEvidenceDir();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const destUri = `${EVIDENCE_DIR}${fileName}`;
  const imageWidth = Number(width) || 0;
  const imageHeight = Number(height) || 0;
  const longestEdge = Math.max(imageWidth, imageHeight);
  const actions = [];

  if (longestEdge > MAX_IMAGE_EDGE) {
    actions.push({
      resize: imageWidth >= imageHeight
        ? { width: MAX_IMAGE_EDGE }
        : { height: MAX_IMAGE_EDGE }
    });
  }

  const processedImage = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG
  });
  await FileSystem.moveAsync({ from: processedImage.uri, to: destUri });
  return destUri;
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function addPendingMistake(entry) {
  const queue = await readQueue();
  const record = {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    synced: false,
    createdAt: new Date().toISOString(),
    ...entry
  };
  queue.push(record);
  await writeQueue(queue);
  return record;
}

export async function getPendingMistakes(userKey) {
  const queue = await readQueue();
  return queue.filter(item => item.userKey === userKey && !item.synced);
}

async function markMistakeSynced(localId) {
  const queue = await readQueue();
  const updated = queue.map(item => (item.localId === localId ? { ...item, synced: true, syncedAt: new Date().toISOString() } : item));
  await writeQueue(updated);
}

// Deletes the on-device photo file once it has been confirmed uploaded, freeing phone storage.
async function deleteLocalFile(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    // Ignore file cleanup failures; the queue entry is still marked synced.
  }
}

// Uploads every not-yet-synced local mistake to the backend, one at a time, using the existing photo endpoint.
export async function syncPendingMistakes(apiUrl, userKey) {
  const pending = await getPendingMistakes(userKey);
  const result = { total: pending.length, succeeded: 0, failed: 0, limited: false };

  for (const item of pending) {
    try {
      const form = new FormData();
      form.append('title', item.title);
      form.append('description', item.description);
      form.append('category', item.category || 'Missing Keywords (OEQ)');
      form.append('userKey', userKey);
      if (item.revisionId) form.append('revisionId', String(item.revisionId));
      if (item.examId) form.append('examId', String(item.examId));
      form.append('photo', { uri: item.localUri, name: `${item.localId}.jpg`, type: 'image/jpeg' });

      const res = await fetch(`${apiUrl}/errors/log-with-photo`, {
        method: 'POST',
        body: form,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.ok) {
        await markMistakeSynced(item.localId);
        await deleteLocalFile(item.localUri);
        result.succeeded += 1;
      } else if (res.status === 429) {
        // Rate limit or daily quota hit — stop syncing now, remaining photos stay queued for next attempt.
        result.limited = true;
        break;
      } else {
        result.failed += 1;
      }
    } catch (e) {
      result.failed += 1;
    }
  }

  return result;
}
