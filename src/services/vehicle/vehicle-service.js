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
  availability
) => {
  const params = new URLSearchParams({ page, size, sort, direction });
  if (availability?.pickUpTime && availability?.dropOffTime) {
    params.set("pickUpTime", availability.pickUpTime);
    params.set("dropOffTime", availability.dropOffTime);
  }
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
  sold = false
) => {
  const response = await axios.get(
    `${API_URL}/car/admin/pages/auth?page=${page}&size=${size}&sort=${sort}&direction=${direction}${sold ? "&sold=1" : ""}`,
    services.authHeader()
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
export const extractRegistration = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(`${API_URL}/car/admin/extract-registration/auth`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`,
    },
  });
  return response.data;
};
