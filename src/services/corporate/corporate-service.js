import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getCorporates = async (q = "") => {
  const response = await axios.get(
    `${API_URL}/corporates/admin/auth${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    services.authHeader()
  );
  return response.data;
};
export const getCorporate = async (id) => {
  const response = await axios.get(`${API_URL}/corporates/admin/${id}/auth`, services.authHeader());
  return response.data;
};
export const addCorporate = async (payload) => {
  const response = await axios.post(`${API_URL}/corporates/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateCorporate = async (id, payload) => {
  const response = await axios.put(`${API_URL}/corporates/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteCorporate = async (id) => {
  const response = await axios.delete(`${API_URL}/corporates/admin/${id}/auth`, services.authHeader());
  return response.data;
};
