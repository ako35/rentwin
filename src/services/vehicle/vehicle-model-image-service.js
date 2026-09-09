import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

const bearer = () => `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`;

export const listModelImages = async () => {
  const response = await axios.get(`${API_URL}/car/admin/model-images/auth`, services.authHeader());
  return response.data;
};

export const uploadModelImage = async ({ brand, model, file }) => {
  const formData = new FormData();
  formData.append("brand", brand);
  formData.append("model", model);
  formData.append("file", file);
  const response = await axios.put(`${API_URL}/car/admin/model-images/auth`, formData, {
    headers: { "Content-Type": "multipart/form-data", Authorization: bearer() },
  });
  return response.data;
};

export const generateModelImage = async ({ brand, model, color }) => {
  const response = await axios.post(
    `${API_URL}/car/admin/model-images/generate/auth`,
    { brand, model, color },
    services.authHeader()
  );
  return response.data;
};

export const deleteModelImage = async (id) => {
  const response = await axios.delete(
    `${API_URL}/car/admin/model-images/${id}/auth`,
    services.authHeader()
  );
  return response.data;
};
