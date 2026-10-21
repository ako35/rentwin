import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { requestPhotoUploadUrl, confirmPhotoUpload, saveReadings } from "../api/client";

// Deliberately simple: one JSON array in AsyncStorage, flushed sequentially.
// No WatermelonDB/background job library — a photo checklist is a handful
// of items at a time, so a persisted array + a re-entrancy guard is enough.
// Items are photos (kind absent, the original format) or km/fuel readings
// (kind: "readings") so readings taken offline at the car wait with the photos.
const QUEUE_KEY = "rentwin-staff-upload-queue-v1";

const newItem = (item) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  status: "pending", // pending | uploading | failed
  attempts: 0,
  lastError: null,
  createdAt: new Date().toISOString(),
  ...item,
});

let listeners = [];
let flushing = false;

const notify = (queue) => listeners.forEach((fn) => fn(queue));

const readQueue = async () => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const writeQueue = async (queue) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notify(queue);
  return queue;
};

// Screens call this to re-render on every queue change (enqueue, progress,
// success, failure) without polling.
export const subscribeQueue = (fn) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
};

export const getQueue = readQueue;

// Call once at app start. An item stuck "uploading" means the app was killed
// mid-flush last session — it never actually failed, it just needs another
// chance, not to be treated as permanently broken.
export const reconcileQueueOnStart = async () => {
  const queue = await readQueue();
  const fixed = queue.map((item) => (item.status === "uploading" ? { ...item, status: "pending" } : item));
  return writeQueue(fixed);
};

// photos: [{ contractId, stage, angle, localUri, mimeType }]
// readings (optional): { contractId, stage, km, fuelEighths } — replaces any
// not-yet-sent readings for the same contract+stage, since only the latest
// value means anything.
export const enqueueCapture = async ({ photos = [], readings = null }) => {
  const queue = await readQueue();
  const kept = readings
    ? queue.filter(
        (q) =>
          !(
            q.kind === "readings" &&
            q.contractId === readings.contractId &&
            q.stage === readings.stage &&
            q.status !== "uploading"
          )
      )
    : queue;
  const next = [
    ...kept,
    ...photos.map(newItem),
    ...(readings ? [newItem({ kind: "readings", ...readings })] : []),
  ];
  await writeQueue(next);
  flushQueue();
  return next;
};

// "Vazgeç" on a failure banner: drops a contract's failed items for good
// (e.g. readings the server rejected — retrying would only fail again).
export const discardFailed = async (contractId) => {
  const queue = await readQueue();
  return writeQueue(queue.filter((q) => !(q.contractId === contractId && q.status === "failed")));
};

const updateItem = async (id, patch) => {
  const queue = await readQueue();
  return writeQueue(queue.map((q) => (q.id === id ? { ...q, ...patch } : q)));
};

const removeItem = async (id) => {
  const queue = await readQueue();
  return writeQueue(queue.filter((q) => q.id !== id));
};

const uploadOne = async (item) => {
  if (item.kind === "readings") {
    await saveReadings(item.contractId, { stage: item.stage, km: item.km, fuelEighths: item.fuelEighths });
    return;
  }
  const { uploadUrl, pathname } = await requestPhotoUploadUrl(item.contractId, {
    stage: item.stage,
    angle: item.angle,
    mimeType: item.mimeType,
  });
  const file = new File(item.localUri);
  await file.upload(uploadUrl, { httpMethod: "PUT", headers: { "Content-Type": item.mimeType } });
  await confirmPhotoUpload(item.contractId, {
    stage: item.stage,
    angle: item.angle,
    pathname,
    mimeType: item.mimeType,
  });
};

// Tries every pending/failed item once, in order. One item's failure never
// blocks the rest — except a 401, which means every remaining item would
// fail the same way, so that stops the whole pass immediately instead of
// burning through the list against a token that's already dead.
export const flushQueue = async () => {
  if (flushing) return;
  flushing = true;
  try {
    const queue = await readQueue();
    for (const item of queue) {
      if (item.status !== "pending" && item.status !== "failed") continue;
      await updateItem(item.id, { status: "uploading" });
      try {
        await uploadOne(item);
        await removeItem(item.id);
      } catch (error) {
        const expired = error?.response?.status === 401;
        await updateItem(item.id, {
          status: "failed",
          attempts: item.attempts + 1,
          lastError: expired
            ? "Oturum süresi doldu, tekrar giriş yapın."
            : error?.response?.data?.message || error?.message || "Yükleme başarısız.",
        });
        if (expired) break;
      }
    }
  } finally {
    flushing = false;
  }
};
