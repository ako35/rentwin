import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getActiveAnnouncements = async () => {
  const response = await axios.get(`${API_URL}/announcements/admin/active/auth`, services.authHeader());
  return response.data;
};
export const getAnnouncements = async () => {
  const response = await axios.get(`${API_URL}/announcements/admin/auth`, services.authHeader());
  return response.data;
};
export const addAnnouncement = async (payload) => {
  const response = await axios.post(`${API_URL}/announcements/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateAnnouncement = async (id, payload) => {
  const response = await axios.put(`${API_URL}/announcements/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteAnnouncement = async (id) => {
  const response = await axios.delete(`${API_URL}/announcements/admin/${id}/auth`, services.authHeader());
  return response.data;
};
