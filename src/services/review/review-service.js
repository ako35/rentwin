import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Public — approved reviews, newest first (+ count/average). `limit` caps the
// list (used by the homepage teaser); omit for the full approved list.
export const getReviews = async (limit) => {
  const response = await axios.get(`${API_URL}/reviews${limit ? `?limit=${limit}` : ""}`);
  return response.data;
};

// Public — /yorumlar's form. Starts PENDING; never shows up until approved.
export const submitReview = async (payload) => {
  const response = await axios.post(`${API_URL}/reviews/visitors`, payload);
  return response.data;
};

// ADMIN ENDPOINTS
export const getReviewsByPageAdmin = async (page = 0, size = 20, status = "") => {
  const response = await axios.get(
    `${API_URL}/reviews/pages?page=${page}&size=${size}${status ? `&status=${status}` : ""}`,
    services.authHeader()
  );
  return response.data;
};
export const approveReview = async (id) => {
  const response = await axios.post(`${API_URL}/reviews/${id}/approve`, {}, services.authHeader());
  return response.data;
};
export const rejectReview = async (id) => {
  const response = await axios.post(`${API_URL}/reviews/${id}/reject`, {}, services.authHeader());
  return response.data;
};
export const deleteReview = async (id) => {
  const response = await axios.delete(`${API_URL}/reviews/${id}`, services.authHeader());
  return response.data;
};
