// // src/apiConfig.js

// // 1. Browser se current IP address (localhost ya Wi-Fi IP) automatic nikalega
// const currentIP = window.location.hostname; 

// // 2. .env file me agar static URL hai to wo chalega, nahi to automatic dynamic IP active ho jayega
// export const baseURL = process.env.REACT_APP_API_URL || `http://${currentIP}:8000`;

// src/apiConfig.js

// Check karega ki site local computer par chal rahi hai ya live server par
// const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// export const baseURL = isLocal 
//   ? 'http://127.0.0.1:8000' 
//   // : 'https://tiyaonline-production.up.railway.app';
//   : 'https://api.jewellershub.in';
  
// export const whatsappURL = isLocal 
//   ? 'http://127.0.0.1:5001' 
//   : 'https://comfortable-vibrancy-production-338f.up.railway.app'; // <-- यहाँ Railway से मिला नया लिंक डालें


// Dynamic detection: Local Machine vs Live Cloud Server
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isLocal = hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') || 
                hostname.startsWith('10.') || 
                hostname.endsWith('.local');

// 1. Agar local machine (localhost/127.0.0.1) par chal raha hai -> Local Backend (127.0.0.1:8000)
// 2. Agar live cloud (asclepiusstore.in ya Railway) par chal raha hai -> Live Cloud Backend
export const baseURL = isLocal 
  ? `http://${hostname === 'localhost' ? '127.0.0.1' : hostname}:8000`
  : (process.env.REACT_APP_API_URL || 'https://asclepiusonlinestore-production.up.railway.app');

export const whatsappURL = isLocal 
  ? 'http://127.0.0.1:5001' 
  : 'https://comfortable-vibrancy-production-338f.up.railway.app';