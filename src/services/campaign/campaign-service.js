import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Public — active campaigns shown on the homepage and the /kampanyalar page.
export const getCampaigns = async () => {
  const response = await axios.get(`${API_URL}/campaigns`);
  return response.data;
};

// ADMIN ENDPOINTS
export const getCampaignsAdmin = async () => {
  const response = await axios.get(`${API_URL}/campaigns/admin/auth`, services.authHeader());
  return response.data;
};
export const addCampaign = async (payload) => {
  const response = await axios.post(`${API_URL}/campaigns/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateCampaign = async (id, payload) => {
  const response = await axios.put(`${API_URL}/campaigns/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteCampaign = async (id) => {
  const response = await axios.delete(`${API_URL}/campaigns/admin/${id}/auth`, services.authHeader());
  return response.data;
};
// Reuses the generic /files/upload blob store (same as locations).
export const uploadCampaignImage = async (formData) => {
  const response = await axios.post(`${API_URL}/files/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`,
    },
  });
  return response.data;
};
