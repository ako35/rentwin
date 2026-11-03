// Admin modülü API çağrıları — web src/services/* ile aynı endpoint'leri kullanır.
// Auth header'ı api/client.js içindeki axios interceptor'u otomatik ekler.
import http from "./client";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getFleetStats = (branchId) =>
  http.get("/car/admin/fleet-stats/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getExpiryAlerts = (branchId) =>
  http.get("/car/admin/expiry-alerts/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getHgsPendingContracts = (branchId) =>
  http.get("/contracts/admin/hgs-pending/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getInvoicePendingContracts = (branchId) =>
  http.get("/contracts/admin/invoice-pending/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getKbsPendingContracts = (branchId) =>
  http.get("/contracts/admin/kbs-pending/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getKbsReleasePendingContracts = (branchId) =>
  http.get("/contracts/admin/kbs-release-pending/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getSignPendingContracts = (branchId) =>
  http.get("/contracts/admin/sign-pending/auth", { params: branchId ? { branchId } : {} }).then((r) => r.data);

export const getAdminSchedule = () =>
  http.get("/contracts/admin/schedule/auth").then((r) => r.data);

// ─── Kontratlar ───────────────────────────────────────────────────────────────

export const getContractsByPage = (params) =>
  http.get("/contracts/admin/all/auth", { params }).then((r) => r.data);

export const getContractById = (id) =>
  http.get(`/contracts/${id}/admin`).then((r) => r.data);

export const returnContract = (id, payload) =>
  http.post(`/contracts/admin/${id}/return/auth`, payload).then((r) => r.data);

export const cancelContract = (id) =>
  http.post(`/contracts/admin/${id}/cancel/auth`).then((r) => r.data);

export const reopenContract = (id) =>
  http.post(`/contracts/admin/${id}/reopen/auth`).then((r) => r.data);

export const listInvoices = (contractId) =>
  http.get(`/contracts/admin/${contractId}/invoices/auth`).then((r) => r.data);

export const getInvoicePdfUrl = (invoiceId) =>
  http.get(`/contracts/admin/invoices/${invoiceId}/pdf-url/auth`).then((r) => r.data);

// ─── Araçlar ─────────────────────────────────────────────────────────────────

export const getVehiclesByPage = (params) =>
  http.get("/car/admin/pages/auth", { params }).then((r) => r.data);

export const getVehicleById = (id) =>
  http.get(`/car/admin/${id}/auth`).then((r) => r.data);

export const getFleetStatusBoard = () =>
  http.get("/car/admin/fleet-status-board/auth").then((r) => r.data);

// ─── Rezervasyonlar ──────────────────────────────────────────────────────────

export const getReservationsByPage = (params) =>
  http.get("/reservations/admin/all/auth", { params }).then((r) => r.data);

export const getReservationById = (id) =>
  http.get(`/reservations/admin/${id}/auth`).then((r) => r.data);

export const confirmReservation = (id) =>
  http.post(`/reservations/admin/${id}/confirm/auth`).then((r) => r.data);

export const cancelReservation = (id) =>
  http.post(`/reservations/admin/${id}/cancel/auth`).then((r) => r.data);

// ─── Kullanıcılar ─────────────────────────────────────────────────────────────

export const getUsersByPage = (params) =>
  http.get("/users/admin/all/auth", { params }).then((r) => r.data);
