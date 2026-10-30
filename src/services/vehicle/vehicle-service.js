import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;
// const API_URL = process.env.VITE_APP_API_URL; normal react da bu sekilde oluyor

// COMMON ENDPOINTS
export const getVehicleById = async (id) => {
  const response = await axios.get(`${API_URL}/car/visitors/${id}`);
  return response.data;
};
// Admin detail fetch — still returns a sold vehicle (the public route 404s it).
export const getVehicleByIdAdmin = async (id) => {
  const response = await axios.get(`${API_URL}/car/admin/${id}/auth`, services.authHeader());
  return response.data;
};
export const getVehicles = async () => {
  const response = await axios.get(`${API_URL}/car/visitors/all`);
  return response.data;
};
export const getVehiclesByPage = async (
  page = 0,
  size = 6,
  sort = "model",
  direction = "ASC",
  availability,
  distinctModel = false
) => {
  const params = new URLSearchParams({ page, size, sort, direction });
  if (availability?.pickUpTime && availability?.dropOffTime) {
    params.set("pickUpTime", availability.pickUpTime);
    params.set("dropOffTime", availability.dropOffTime);
  }
  if (distinctModel) params.set("distinctModel", "1");
  const response = await axios.get(`${API_URL}/car/visitors/pages?${params.toString()}`);
  return response.data;
};

// ADMIN ENDPOINTS
export const addVehicle = async(payload) => {
  const response = await axios.post(
    `${API_URL}/car/admin/add`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const deleteVehicle = async(id) => {
  const response = await axios.delete(`${API_URL}/car/admin/${id}/auth`, services.authHeader());
  return response.data;
};
export const markVehicleSold = async (id, payload) => {
  const response = await axios.post(
    `${API_URL}/car/admin/${id}/sold/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const unmarkVehicleSold = async (id) => {
  const response = await axios.delete(
    `${API_URL}/car/admin/${id}/sold/auth`,
    services.authHeader()
  );
  return response.data;
};
export const markVehiclePassive = async (id, payload) => {
  const response = await axios.post(
    `${API_URL}/car/admin/${id}/passive/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const unmarkVehiclePassive = async (id) => {
  const response = await axios.delete(
    `${API_URL}/car/admin/${id}/passive/auth`,
    services.authHeader()
  );
  return response.data;
};
export const updateVehicleTracking = async (id, payload) => {
  const response = await axios.patch(
    `${API_URL}/car/admin/${id}/tracking/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const downloadVehicleReports = async() => {
  const token = services.encryptedLocalStorage.getItem("rentwintoken");
  const response = await axios.get(`${API_URL}/excel/download/cars`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob",
  });
  return response.data;
};
export const updateVehicle = async(vehicleId, payload) => {
  const response = await axios.put(
    `${API_URL}/car/admin/auth?id=${vehicleId}`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const getVehiclesByPageAdmin = async (
  page = 0,
  size = 20,
  sort = "id",
  direction = "DESC",
  sold = false,
  query = "",
  branchId = ""
) => {
  const params = new URLSearchParams({ page, size, sort, direction });
  if (sold) params.set("sold", "1");
  if (query) params.set("q", query);
  if (branchId) params.set("branchId", branchId);

  const response = await axios.get(`${API_URL}/car/admin/pages/auth?${params}`, services.authHeader());
  return response.data;
};
export const getPriceList = async () => {
  const response = await axios.get(`${API_URL}/car/admin/price-list/auth`, services.authHeader());
  return response.data;
};
// Web search can take a while (multiple live queries in one API call) — a
// longer client timeout than the default so a legitimately slow-but-working
// research call isn't cut off before the server responds.
export const researchVehiclePrice = async (vehicleId) => {
  const response = await axios.post(
    `${API_URL}/car/admin/${vehicleId}/research-price/auth`,
    {},
    { ...services.authHeader(), timeout: 100000 }
  );
  return response.data;
};
export const getFleetStats = async (branchId) => {
  const response = await axios.get(
    `${API_URL}/car/admin/fleet-stats/auth${branchId ? `?branchId=${branchId}` : ""}`,
    services.authHeader()
  );
  return response.data;
};
export const getExpiryAlerts = async (branchId) => {
  const response = await axios.get(
    `${API_URL}/car/admin/expiry-alerts/auth${branchId ? `?branchId=${branchId}` : ""}`,
    services.authHeader()
  );
  return response.data;
};
export const getInspectionAppointments = async (branchId, vehicleId) => {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  if (vehicleId) params.set("vehicleId", vehicleId);
  const queryString = params.toString();
  const query = queryString ? `?${queryString}` : "";
  const response = await axios.get(
    `${API_URL}/car/admin/inspection-appointments/auth${query}`,
    services.authHeader()
  );
  return response.data;
};
export const createInspectionAppointment = async (payload) => {
  const response = await axios.post(
    `${API_URL}/car/admin/inspection-appointments/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const updateInspectionAppointment = async (appointmentId, payload) => {
  const response = await axios.patch(
    `${API_URL}/car/admin/inspection-appointments/${appointmentId}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const getFleetStatusBoard = async (branchId) => {
  const response = await axios.get(
    `${API_URL}/car/admin/fleet-status-board/auth${branchId ? `?branchId=${branchId}` : ""}`,
    services.authHeader()
  );
  return response.data;
};
