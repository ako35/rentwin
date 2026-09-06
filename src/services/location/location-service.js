import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Public – feeds every pick-up/drop-off location field (homepage search,
// booking form, admin contract form) and the admin management list.
export const getLocations = async () => {
  const response = await axios.get(`${API_URL}/locations`);
  return response.data;
};
export const addLocation = async (payload) => {
  const response = await axios.post(`${API_URL}/locations/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateLocation = async (id, payload) => {
  const response = await axios.put(`${API_URL}/locations/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteLocation = async (id) => {
  const response = await axios.delete(`${API_URL}/locations/admin/${id}/auth`, services.authHeader());
  return response.data;
};
export const uploadLocationImage = async (formData) => {
  const response = await axios.post(`${API_URL}/files/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`,
    },
  });
  return response.data;
};
