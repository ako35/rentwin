import axios from "axios";
import Constants from "expo-constants";
import { getToken, clearSession } from "../auth/session";

const API_URL = Constants.expoConfig.extra.apiUrl;

const http = axios.create({ baseURL: API_URL });

// AuthContext registers this so a dead token anywhere sends the user back to
// the login screen instead of leaving them on a screen whose requests all fail.
let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

http.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 here always means the token's dead (expired 7-day JWT, or revoked) —
// there's no refresh flow, so clear the session and let the caller's own
// try/catch surface a "please log in again" state rather than retrying
// forever against a token that will never start working again.
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await clearSession();
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);

export const login = (email, password) => http.post("/login", { email, password }).then((r) => r.data);

export const getCurrentUser = () => http.get("/user").then((r) => r.data);

// { departures, returns } — rows carry bucket (overdue | today | tomorrow) and
// done; see backend/src/modules/field/field.controller.js.
export const getFieldSchedule = () => http.get("/field/schedule/auth").then((r) => r.data);

export const getFieldContract = (contractId) =>
  http.get(`/field/contracts/${contractId}/auth`).then((r) => r.data);

export const saveReadings = (contractId, { stage, km, fuelEighths }) =>
  http.put(`/field/contracts/${contractId}/readings/auth`, { stage, km, fuelEighths }).then((r) => r.data);

// Photos already uploaded for a contract, with short-lived signed blobUrls.
export const listPhotos = (contractId, stage) =>
  http.get(`/contracts/admin/${contractId}/photos/auth`, { params: { stage } }).then((r) => r.data);

export const requestPhotoUploadUrl = (contractId, { stage, angle, mimeType }) =>
  http
    .post(`/contracts/admin/${contractId}/photos/upload-url/auth`, { stage, angle, mimeType })
    .then((r) => r.data);

export const confirmPhotoUpload = (contractId, payload) =>
  http.post(`/contracts/admin/${contractId}/photos/auth`, payload).then((r) => r.data);

export default http;
