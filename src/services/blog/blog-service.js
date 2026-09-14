import axios from "axios";
import { services } from "..";

const API_URL = import.meta.env.VITE_APP_API_URL;

// Public — published posts, newest first.
export const getBlogPosts = async () => {
  const response = await axios.get(`${API_URL}/blog`);
  return response.data;
};

// Public single post — a draft or unknown slug 404s.
export const getBlogPostBySlug = async (slug) => {
  const response = await axios.get(`${API_URL}/blog/${slug}`);
  return response.data;
};

// ADMIN ENDPOINTS
export const getBlogPostsAdmin = async () => {
  const response = await axios.get(`${API_URL}/blog/admin/auth`, services.authHeader());
  return response.data;
};
export const addBlogPost = async (payload) => {
  const response = await axios.post(`${API_URL}/blog/admin/auth`, payload, services.authHeader());
  return response.data;
};
export const updateBlogPost = async (id, payload) => {
  const response = await axios.put(`${API_URL}/blog/admin/${id}/auth`, payload, services.authHeader());
  return response.data;
};
export const deleteBlogPost = async (id) => {
  const response = await axios.delete(`${API_URL}/blog/admin/${id}/auth`, services.authHeader());
  return response.data;
};
// Reuses the generic /files/upload blob store (same as locations/campaigns).
export const uploadBlogImage = async (formData) => {
  const response = await axios.post(`${API_URL}/files/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${services.encryptedLocalStorage.getItem("rentwintoken")}`,
    },
  });
  return response.data;
};
