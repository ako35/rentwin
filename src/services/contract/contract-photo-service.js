import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Read + delete only — uploads always originate from the mobile app, never
// from the web admin (see backend/src/modules/contract-photos).
export const getContractPhotos = async (contractId, stage) => {
  const response = await axios.get(`${API_URL}/contracts/admin/${contractId}/photos/auth`, {
    ...services.authHeader(),
    params: stage ? { stage } : undefined,
  });
  return response.data;
};

export const deleteContractPhoto = async (id) => {
  const response = await axios.delete(`${API_URL}/contracts/admin/photos/${id}/auth`, services.authHeader());
  return response.data;
};
