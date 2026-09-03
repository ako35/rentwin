import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getContractsByPage = async (page = 0, size = 10, filters = {}) => {
  const params = new URLSearchParams({ page, size });
  ["branchId", "status", "plate", "customer"].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  const response = await axios.get(
    `${API_URL}/contracts/admin/all/auth?${params.toString()}`,
    services.authHeader()
  );
  return response.data;
};

export const getContractByIdAdmin = async (id) => {
  const response = await axios.get(`${API_URL}/contracts/${id}/admin`, services.authHeader());
  return response.data;
};

export const createContract = async (payload) => {
  const response = await axios.post(`${API_URL}/contracts/admin/auth`, payload, services.authHeader());
  return response.data;
};

export const updateContract = async (carId, contractId, payload) => {
  const response = await axios.put(
    `${API_URL}/contracts/admin/auth?carId=${carId}&contractId=${contractId}`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const deleteContract = async (id) => {
  const response = await axios.delete(`${API_URL}/contracts/admin/${id}/auth`, services.authHeader());
  return response.data;
};

// Contract lifecycle: "Araç Teslim Al" -> DONE, "Kontratı İptal Et" -> CANCELLED,
// "Geri Aç" -> CREATED. Each returns { id, status }.
export const returnContract = async (id) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${id}/return/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};

export const cancelContract = async (id) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${id}/cancel/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};

export const reopenContract = async (id) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${id}/reopen/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};

export const extendContract = async (id, payload) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${id}/extend/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const createInvoice = async (id, payload = {}) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${id}/invoice/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const getAvailableCars = async ({ pickUpTime, dropOffTime, excludeContractId, excludeReservationId } = {}) => {
  const params = new URLSearchParams({ pickUpTime, dropOffTime });
  if (excludeContractId) params.set("excludeContractId", excludeContractId);
  if (excludeReservationId) params.set("excludeReservationId", excludeReservationId);
  const response = await axios.get(
    `${API_URL}/contracts/admin/available-cars/auth?${params.toString()}`,
    services.authHeader()
  );
  return response.data;
};

export const getAdminSchedule = async ({ type, window = 7, excludeCompleted = true, branchId }) => {
  const response = await axios.get(
    `${API_URL}/contracts/admin/schedule/auth?type=${type}&window=${window}&excludeCompleted=${excludeCompleted}${
      branchId ? `&branchId=${branchId}` : ""
    }`,
    services.authHeader()
  );
  return response.data;
};

export const downloadContractReports = async () => {
  const token = services.encryptedLocalStorage.getItem("rentwintoken");
  const response = await axios.get(`${API_URL}/excel/download/contracts`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  return response.data;
};
