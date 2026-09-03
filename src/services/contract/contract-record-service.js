import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// resource: "drivers" | "payments" | "extras"
export const getContractRecords = async (contractId, resource) => {
  const response = await axios.get(
    `${API_URL}/contracts/admin/${contractId}/${resource}/auth`,
    services.authHeader()
  );
  return response.data;
};

export const addContractRecord = async (contractId, resource, payload) => {
  const response = await axios.post(
    `${API_URL}/contracts/admin/${contractId}/${resource}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const updateContractRecord = async (resource, id, payload) => {
  const response = await axios.put(
    `${API_URL}/contracts/admin/${resource}/${id}/records/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const deleteContractRecord = async (resource, id) => {
  const response = await axios.delete(
    `${API_URL}/contracts/admin/${resource}/${id}/records/auth`,
    services.authHeader()
  );
  return response.data;
};
