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


const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Ab yeh sabse pehle Railway ka variable check karega, nahi milne par Asclepius backend URL use karega
export const baseURL = process.env.REACT_APP_API_URL || (isLocal ? 'http://127.0.0.1:8000' : 'https://asclepiusonlinestore-production.up.railway.app');

export const whatsappURL = isLocal 
  ? 'http://127.0.0.1:5001' 
  : 'https://comfortable-vibrancy-production-338f.up.railway.app';