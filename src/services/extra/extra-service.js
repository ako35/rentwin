import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getExtras = async (all = false) => {
  const response = await axios.get(
    `${API_URL}/extras/admin/auth${all ? "?all=true" : ""}`,
    services.authHeader()
  );
  return response.data;
};
export const addExtra = async (payload) => {
  const response = await axios.post(`${API_URL}/extras/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateExtra = async (id, payload) => {
  const response = await axios.put(`${API_URL}/extras/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteExtra = async (id) => {
  const response = await axios.delete(`${API_URL}/extras/admin/${id}/auth`, services.authHeader());
  return response.data;
};
