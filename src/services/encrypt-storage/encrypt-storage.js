import { EncryptStorage } from "encrypt-storage";

// encrypt-storage v3 uses a new encryption format. Existing values were only
// auth tokens, so discard the old token once and let users sign in again rather
// than attempting to decrypt data with an incompatible algorithm.
const storageVersionKey = "__rentwin_encrypted_storage_version__";
if (localStorage.getItem(storageVersionKey) !== "3-noble") {
  localStorage.removeItem("rentwintoken");
  localStorage.setItem(storageVersionKey, "3-noble");
}

export const encryptedLocalStorage = EncryptStorage.create(
  import.meta.env.VITE_APP_ENCRYPTION_KEY,
  { engine: "noble" },
);
