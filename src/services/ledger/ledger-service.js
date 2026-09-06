import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Cari (current-account) statement for one customer + manual entry CRUD.
export const getUserLedger = async (userId, filters = {}) => {
  const params = new URLSearchParams();
  ["from", "to", "category"].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  const query = params.toString();
  const response = await axios.get(
    `${API_URL}/ledger/admin/${userId}/auth${query ? `?${query}` : ""}`,
    services.authHeader()
  );
  return response.data;
};

export const addLedgerEntry = async (payload) => {
  const response = await axios.post(`${API_URL}/ledger/admin/auth`, payload, services.authHeader());
  return response.data;
};

export const updateLedgerEntry = async (id, payload) => {
  const response = await axios.put(`${API_URL}/ledger/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};

export const deleteLedgerEntry = async (id) => {
  const response = await axios.delete(`${API_URL}/ledger/admin/${id}/auth`, services.authHeader());
  return response.data;
};
