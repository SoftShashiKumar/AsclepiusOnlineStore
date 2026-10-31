// src/apiConfig.js

// Dynamic detection: Local Machine vs Live Cloud Server
const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'localhost';
const isLocal = hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.endsWith('.localhost') ||
                hostname.startsWith('192.168.') || 
                hostname.startsWith('10.') || 
                hostname.endsWith('.local');

// 1. Agar local machine (localhost/127.0.0.1/sub.localhost) par chal raha hai -> Local Backend (127.0.0.1:8000)
// 2. Agar live cloud (asclepiusstore.in ya Railway) par chal raha hai -> Live Cloud Backend
export const baseURL = isLocal 
  ? 'http://127.0.0.1:8000'
  : (process.env.REACT_APP_API_URL || 'https://asclepiusonlinestore-production.up.railway.app');

export const whatsappURL = isLocal 
  ? 'http://127.0.0.1:5001' 
  : 'https://comfortable-vibrancy-production-338f.up.railway.app';

export default baseURL;
