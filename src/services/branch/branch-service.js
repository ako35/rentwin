import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getBranches = async () => {
  const response = await axios.get(`${API_URL}/branches/admin/auth`, services.authHeader());
  return response.data;
};
// Public – homepage reservation search location suggestions
export const getPublicBranches = async () => {
  const response = await axios.get(`${API_URL}/branches`);
  return response.data;
};
export const addBranch = async (payload) => {
  const response = await axios.post(`${API_URL}/branches/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateBranch = async (id, payload) => {
  const response = await axios.put(`${API_URL}/branches/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteBranch = async (id) => {
  const response = await axios.delete(`${API_URL}/branches/admin/${id}/auth`, services.authHeader());
  return response.data;
};
