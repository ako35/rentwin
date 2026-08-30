import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// resource: "drivers" | "payments"
export const getReservationRecords = async (reservationId, resource) => {
  const response = await axios.get(
    `${API_URL}/reservations/admin/${reservationId}/${resource}/auth`,
    services.authHeader()
  );
  return response.data;
};
export const addReservationRecord = async (reservationId, resource, payload) => {
  const response = await axios.post(
    `${API_URL}/reservations/admin/${reservationId}/${resource}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const updateReservationRecord = async (resource, id, payload) => {
  const response = await axios.put(
    `${API_URL}/reservations/admin/${resource}/${id}/records/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};
export const deleteReservationRecord = async (resource, id) => {
  const response = await axios.delete(
    `${API_URL}/reservations/admin/${resource}/${id}/records/auth`,
    services.authHeader()
  );
  return response.data;
};
