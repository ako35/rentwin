import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getSettings = async () => {
  const response = await axios.get(`${API_URL}/settings/admin/auth`, services.authHeader());
  return response.data;
};

export const updateSettings = async (payload) => {
  const response = await axios.put(`${API_URL}/settings/admin/auth`, payload, services.authHeader());
  return response.data;
};
