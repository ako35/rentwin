import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// ---- Customer-facing booking ----
export const createReservation = async (carId, dto) => {
  const response = await axios.post(
    `${API_URL}/reservations/add?carId=${carId}`,
    dto,
    services.authHeader()
  );
  return response.data;
};

export const getReservationById = async (id) => {
  const response = await axios.get(`${API_URL}/reservations/${id}/auth`, services.authHeader());
  return response.data;
};

export const getReservationsByPage = async (
  page = 0,
  size = 20,
  sort = "pickUpTime",
  direction = "DESC"
) => {
  const response = await axios.get(
    `${API_URL}/reservations/auth/all?page=${page}&size=${size}&sort=${sort}&direction=${direction}`,
    services.authHeader()
  );
  return response.data;
};

export const isVehicleAvailable = async (payload) => {
  const { carId, pickUpDateTime, dropOffDateTime } = payload;
  const response = await axios.get(
    `${API_URL}/reservations/auth?carId=${carId}&pickUpDateTime=${pickUpDateTime}&dropOffDateTime=${dropOffDateTime}`,
    services.authHeader()
  );
  return response.data;
};

// ---- Admin booking management ----
export const getReservationsByPageAdmin = async (page = 0, size = 10, filters = {}) => {
  const params = new URLSearchParams({ page, size });
  ["branchId", "status", "plate", "customer"].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  const response = await axios.get(
    `${API_URL}/reservations/admin/all/auth?${params.toString()}`,
    services.authHeader()
  );
  return response.data;
};

export const getReservationByIdAdmin = async (id) => {
  const response = await axios.get(`${API_URL}/reservations/admin/${id}/auth`, services.authHeader());
  return response.data;
};

export const createReservationAdmin = async (payload) => {
  const response = await axios.post(
    `${API_URL}/reservations/admin/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const updateReservationAdmin = async (id, payload) => {
  const response = await axios.put(
    `${API_URL}/reservations/admin/${id}/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

export const confirmReservation = async (id) => {
  const response = await axios.post(
    `${API_URL}/reservations/admin/${id}/confirm/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};

export const cancelReservation = async (id) => {
  const response = await axios.post(
    `${API_URL}/reservations/admin/${id}/cancel/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};

export const convertReservationToContract = async (id) => {
  const response = await axios.post(
    `${API_URL}/reservations/admin/${id}/convert/auth`,
    {},
    services.authHeader()
  );
  return response.data;
};
