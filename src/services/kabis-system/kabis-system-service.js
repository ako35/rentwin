import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getKabisSystems = async () => {
  const response = await axios.get(`${API_URL}/kabis-systems/admin/auth`, services.authHeader());
  return response.data;
};

export const addKabisSystem = async (payload) => {
  const response = await axios.post(`${API_URL}/kabis-systems/admin/auth`, payload, services.authHeader());
  return response.data;
};

export const deleteKabisSystem = async (id) => {
  const response = await axios.delete(`${API_URL}/kabis-systems/admin/${id}/auth`, services.authHeader());
  return response.data;
};
