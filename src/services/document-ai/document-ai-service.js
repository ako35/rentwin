import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;
const ENDPOINTS = {
  registration: "/car/admin/extract-registration/auth",
  insurance: "/car/admin/extract-insurance/auth",
  inspection: "/car/admin/extract-inspection/auth",
  individual: "/user/auth/extract-document",
  corporate: "/user/auth/extract-document",
  invoice: "/contracts/admin/invoice/extract/auth",
};

export const extractDocument = async (file, kind) => {
  const endpoint = ENDPOINTS[kind];
  if (!endpoint) throw new Error("Unsupported document type.");

  const formData = new FormData();
  formData.append("file", file);
  if (kind === "individual" || kind === "corporate") formData.append("kind", kind);

  const response = await axios.post(`${API_URL}${endpoint}`, formData, {
    ...services.authHeader(),
    timeout: 60000,
  });
  return response.data;
};
