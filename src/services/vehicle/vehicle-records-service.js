import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// resource: "insurances" | "taxes" | "maintenances" | "inspections"
export const getVehicleRecords = async (vehicleId, resource) => {
  const response = await axios.get(
    `${API_URL}/car/admin/${vehicleId}/${resource}/auth`,
    services.authHeader()
  );
  return response.data;
};

export const addVehicleRecord = async (vehicleId, resource, payload) => {
  const response = await axios.post(
    `${API_URL}/car/admin/${vehicleId}/${resource}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const updateVehicleRecord = async (resource, id, payload) => {
  const response = await axios.put(
    `${API_URL}/car/admin/${resource}/${id}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const deleteVehicleRecord = async (resource, id) => {
  const response = await axios.delete(
    `${API_URL}/car/admin/${resource}/${id}/auth`,
    services.authHeader()
  );
  return response.data;
};
