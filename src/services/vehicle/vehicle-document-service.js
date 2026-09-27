import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

const bearer = () => `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`;

export const getVehicleDocuments = async (vehicleId) => {
  const response = await axios.get(
    `${API_URL}/car/admin/${vehicleId}/documents/auth`,
    services.authHeader()
  );
  return response.data;
};

export const addVehicleDocument = async (vehicleId, { name, file }) => {
  const formData = new FormData();
  if (name) formData.append("name", name);
  formData.append("file", file);
  const response = await axios.post(`${API_URL}/car/admin/${vehicleId}/documents/auth`, formData, {
    headers: { "Content-Type": "multipart/form-data", Authorization: bearer() },
  });
  return response.data;
};

export const deleteVehicleDocument = async (id) => {
  const response = await axios.delete(`${API_URL}/car/admin/documents/${id}/auth`, services.authHeader());
  return response.data;
};
