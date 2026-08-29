import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

export const getVehicleClasses = async () => {
  const response = await axios.get(`${API_URL}/vehicle-classes/admin/auth`, services.authHeader());
  return response.data;
};

export const addVehicleClass = async (payload) => {
  const response = await axios.post(
    `${API_URL}/vehicle-classes/admin/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const updateVehicleClass = async (id, payload) => {
  const response = await axios.put(
    `${API_URL}/vehicle-classes/admin/${id}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const deleteVehicleClass = async (id) => {
  const response = await axios.delete(
    `${API_URL}/vehicle-classes/admin/${id}/auth`,
    services.authHeader()
  );
  return response.data;
};
