import axios from 'axios';
import { baseURL } from '../apiConfig'; // <-- Apni nayi central file se baseURL import kiya


// 🌐 1. Backend ka Base URL set kar rahe hain
// const baseURL = process.env.REACT_APP_API_URL || 'http://10.179.18.97:8000';
const API = axios.create({
//   baseURL: 'http://127.0.0.1:8000/',
  // baseURL: 'http://10.179.18.97/',
  baseURL: `${baseURL}`,
});

// 🛡️ 2. REQUEST INTERCEPTOR: Har request ke sath token automatic bhejna
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Django SimpleJWT authorization header me 'Bearer <token>' maangta hai
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;