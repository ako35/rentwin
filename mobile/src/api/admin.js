// Admin modülü API çağrıları — web src/services/* ile aynı endpoint'leri kullanır.
// Auth header'ı api/client.js içindeki axios interceptor'u otomatik ekler.
//
// Sayfalı listeler (kontrat / araç / rezervasyon / kullanıcı) Spring Page
// biçiminde döner: { content, totalElements, last, number, ... } ve `page`
// 0'dan başlar, sayfa boyutu `size` ile verilir (backend/src/lib/pagination.js).
import http from "./client";

const branchParams = (branchId) => ({ params: branchId ? { branchId } : {} });

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getFleetStats = (branchId) =>
  http.get("/car/admin/fleet-stats/auth", branchParams(branchId)).then((r) => r.data);

// { windowDays, windowKm, categories: { insurance, kasko, tax, inspection, maintenance } }
export const getExpiryAlerts = (branchId) =>
  http.get("/car/admin/expiry-alerts/auth", branchParams(branchId)).then((r) => r.data);

export const getHgsPendingContracts = (branchId) =>
  http.get("/contracts/admin/hgs-pending/auth", branchParams(branchId)).then((r) => r.data);

export const getInvoicePendingContracts = (branchId) =>
  http.get("/contracts/admin/invoice-pending/auth", branchParams(branchId)).then((r) => r.data);

export const getKbsPendingContracts = (branchId) =>
  http.get("/contracts/admin/kbs-pending/auth", branchParams(branchId)).then((r) => r.data);

export const getKbsReleasePendingContracts = (branchId) =>
  http.get("/contracts/admin/kbs-release-pending/auth", branchParams(branchId)).then((r) => r.data);

export const getSignPendingContracts = (branchId) =>
  http.get("/contracts/admin/sign-pending/auth", branchParams(branchId)).then((r) => r.data);

// params: { type: "returns" | "departures", window: "today"|3|7|15|30,
// excludeCompleted: "true", branchId } — düz dizi döner.
export const getAdminSchedule = (params = {}) =>
  http.get("/contracts/admin/schedule/auth", { params }).then((r) => r.data);

// ─── Kontratlar ───────────────────────────────────────────────────────────────

// params: { page, size, status: CREATED|DONE|CANCELLED, plate, customer, branchId }
export const getContractsByPage = (params) =>
  http.get("/contracts/admin/all/auth", { params }).then((r) => r.data);

export const getContractById = (id) =>
  http.get(`/contracts/${id}/admin`).then((r) => r.data);

export const getContractsByVehicle = (vehicleId) =>
  http.get(`/contracts/admin/by-vehicle/${vehicleId}/auth`).then((r) => r.data);

export const getContractsByUser = (userId) =>
  http.get(`/contracts/admin/by-user/${userId}/auth`).then((r) => r.data);

// payload: { newDropOff: "MM/DD/YYYY HH:mm:ss", extraAmount?: net TL, note? }
export const extendContract = (id, payload) =>
  http.post(`/contracts/admin/${id}/extend/auth`, payload).then((r) => r.data);

export const deleteExtension = (id, extensionId) =>
  http.delete(`/contracts/admin/${id}/extension/${extensionId}/auth`).then((r) => r.data);

// payload: { returnKm, returnFuelEighths, returnedAt: "MM/DD/YYYY HH:mm:ss",
// charges: [{ category: "KM_EXCESS"|"FUEL", description, amount, quantity }] }
export const returnContract = (id, payload) =>
  http.post(`/contracts/admin/${id}/return/auth`, payload).then((r) => r.data);

export const cancelContract = (id) =>
  http.post(`/contracts/admin/${id}/cancel/auth`).then((r) => r.data);

export const reopenContract = (id) =>
  http.post(`/contracts/admin/${id}/reopen/auth`).then((r) => r.data);

export const listInvoices = (contractId) =>
  http.get(`/contracts/admin/${contractId}/invoices/auth`).then((r) => r.data);

// { url } — kısa ömürlü imzalı indirme bağlantısı.
export const getInvoicePdfUrl = (invoiceId) =>
  http.get(`/contracts/admin/invoices/${invoiceId}/pdf-url/auth`).then((r) => r.data);

// ─── Araçlar ─────────────────────────────────────────────────────────────────

// params: { page, size, q, branchId, sold: "1" } — durum filtresi q içindeki
// "müsait" / "kirada" / "pasif" / "servis" kelimesiyle yapılır.
export const getVehiclesByPage = (params) =>
  http.get("/car/admin/pages/auth", { params }).then((r) => r.data);

export const getVehicleById = (id) =>
  http.get(`/car/admin/${id}/auth`).then((r) => r.data);

export const getFleetStatusBoard = () =>
  http.get("/car/admin/fleet-status-board/auth").then((r) => r.data);

export const addVehicle = (payload) =>
  http.post("/car/admin/add", payload).then((r) => r.data);

// Kısmi güncelleme: yalnızca gönderilen alanlar yazılır (vehicle-fields.js).
export const updateVehicle = (id, payload) =>
  http.put("/car/admin/auth", payload, { params: { id } }).then((r) => r.data);

export const markVehiclePassive = (id, payload) =>
  http.post(`/car/admin/${id}/passive/auth`, payload).then((r) => r.data);

export const unmarkVehiclePassive = (id) =>
  http.delete(`/car/admin/${id}/passive/auth`).then((r) => r.data);

// [{ id, brand, model, licensePlate, modelYear, dailyPrice, monthlyPrice }]
export const getPriceList = () =>
  http.get("/car/admin/price-list/auth").then((r) => r.data);

// ─── Şubeler ─────────────────────────────────────────────────────────────────

// [{ id, name, code, builtIn, vehicleCount }]
export const getAllBranches = () =>
  http.get("/branches/admin/auth").then((r) => r.data);

export const addBranch = (payload) =>
  http.post("/branches/admin/auth", payload).then((r) => r.data);

export const updateBranch = (id, payload) =>
  http.put(`/branches/admin/${id}/auth`, payload).then((r) => r.data);

export const deleteBranch = (id) =>
  http.delete(`/branches/admin/${id}/auth`).then((r) => r.data);

// ─── Rezervasyonlar ──────────────────────────────────────────────────────────

// params: { page, size, status: PENDING|CONFIRMED|CANCELLED|CONVERTED, plate, customer, branchId }
export const getReservationsByPage = (params) =>
  http.get("/reservations/admin/all/auth", { params }).then((r) => r.data);

export const getReservationById = (id) =>
  http.get(`/reservations/admin/${id}/auth`).then((r) => r.data);

export const confirmReservation = (id) =>
  http.post(`/reservations/admin/${id}/confirm/auth`).then((r) => r.data);

export const cancelReservation = (id) =>
  http.post(`/reservations/admin/${id}/cancel/auth`).then((r) => r.data);

// Rezervasyondan kontrat taslağı oluşturur; yeni kontratı döner.
export const convertReservation = (id) =>
  http.post(`/reservations/admin/${id}/convert/auth`).then((r) => r.data);

// ─── Kullanıcılar ─────────────────────────────────────────────────────────────

// params: { page, size, q, role: "Customer"|"Administrator", sort, direction }
export const getUsersByPage = (params) =>
  http.get("/user/auth/pages", { params }).then((r) => r.data);

export const getUserAdmin = (id) =>
  http.get(`/user/${id}/auth`).then((r) => r.data);

// Cari ekstre: { user, debit, credit, balance, ... } — balance = alacak − borç.
export const getUserLedger = (userId) =>
  http.get(`/ledger/admin/${userId}/auth`).then((r) => r.data);

// ─── Duyurular ───────────────────────────────────────────────────────────────

export const getAnnouncements = () =>
  http.get("/announcements/admin/auth").then((r) => r.data);

export const addAnnouncement = (payload) =>
  http.post("/announcements/admin/auth", payload).then((r) => r.data);

export const updateAnnouncement = (id, payload) =>
  http.put(`/announcements/admin/${id}/auth`, payload).then((r) => r.data);

export const deleteAnnouncement = (id) =>
  http.delete(`/announcements/admin/${id}/auth`).then((r) => r.data);

// ─── Ayarlar ─────────────────────────────────────────────────────────────────

export const getSettings = () =>
  http.get("/settings/admin/auth").then((r) => r.data);

// PUT tüm alanları yazar — gönderilmeyen alan null olur, bu yüzden her zaman
// mevcut ayarların tamamı gönderilmeli.
export const updateSettings = (payload) =>
  http.put("/settings/admin/auth", payload).then((r) => r.data);
