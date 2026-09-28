import axios from "axios";
import Constants from "expo-constants";
import { getToken, clearSession } from "../auth/session";

const API_URL = Constants.expoConfig.extra.apiUrl;

const http = axios.create({ baseURL: API_URL });

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
    if (error.response?.status === 401) await clearSession();
    return Promise.reject(error);
  }
);

export const login = (email, password) => http.post("/login", { email, password }).then((r) => r.data);

export const getCurrentUser = () => http.get("/user").then((r) => r.data);

// type: "departures" (pickups) | "returns". window="today" actually returns
// everything still outstanding up to end of today, not just today's — see
// backend/src/modules/contracts/contracts.admin.controller.js getAdminSchedule.
export const getSchedule = (type) =>
  http
    .get("/contracts/admin/schedule/auth", { params: { type, window: "today", excludeCompleted: "true" } })
    .then((r) => r.data);

export const requestPhotoUploadUrl = (contractId, { stage, angle, mimeType }) =>
  http
    .post(`/contracts/admin/${contractId}/photos/upload-url/auth`, { stage, angle, mimeType })
    .then((r) => r.data);

export const confirmPhotoUpload = (contractId, payload) =>
  http.post(`/contracts/admin/${contractId}/photos/auth`, payload).then((r) => r.data);

export default http;
