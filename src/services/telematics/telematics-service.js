import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// GPS takip (docs/gps-takip-yol-haritasi.md). Coordinates are fetched from the
// Traccar server on every call and are never stored by Rentwin.

export const getFleetPositions = async () => {
  const response = await axios.get(`${API_URL}/telematics/admin/fleet/auth`, services.authHeader());
  return response.data;
};

export const getVehicleTelematics = async (vehicleId) => {
  const response = await axios.get(`${API_URL}/telematics/admin/vehicles/${vehicleId}/auth`, services.authHeader());
  return response.data;
};

export const setVehicleTracker = async (vehicleId, imei) => {
  const response = await axios.put(
    `${API_URL}/telematics/admin/vehicles/${vehicleId}/tracker/auth`,
    { imei },
    services.authHeader()
  );
  return response.data;
};

// { reason, note } — opens a rented vehicle's live location for a while.
export const grantLocationAccess = async (vehicleId, payload) => {
  const response = await axios.post(
    `${API_URL}/telematics/admin/vehicles/${vehicleId}/access/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

// { from, to, reason?, note? } (ISO). Answers 409 REASON_REQUIRED when the
// range overlaps a rental and no reason was sent.
export const getVehicleRoute = async (vehicleId, payload) => {
  const response = await axios.post(
    `${API_URL}/telematics/admin/vehicles/${vehicleId}/route/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

// { reason, note, from?, to? }
export const getContractRoute = async (contractId, payload) => {
  const response = await axios.post(
    `${API_URL}/telematics/admin/contracts/${contractId}/route/auth`,
    payload,
    services.authHeader()
  );
  return response.data;
};

// { vehicleId?, contractId? }
export const getTelematicsAccessLogs = async (params = {}) => {
  const response = await axios.get(`${API_URL}/telematics/admin/access-logs/auth`, {
    ...services.authHeader(),
    params,
  });
  return response.data;
};
