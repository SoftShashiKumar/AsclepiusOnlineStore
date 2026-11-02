// src/apiConfig.js
import axios from 'axios';
import { getActiveSubdomain, isRealSubdomainHost } from './utils/subdomain';

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

// 🌐 Helper function to get current active firm ID
export const getCurrentFirmId = () => {
  if (typeof window === 'undefined') return 'SHREE';
  const sub = getActiveSubdomain();

  // If visiting an actual tenant subdomain (e.g. shree.asclepiusstore.in or demo.asclepiusstore.in),
  // the hostname subdomain is authoritative!
  if (isRealSubdomainHost()) {
    const firmFromSub = sub.toUpperCase();
    sessionStorage.setItem('active_subdomain', sub);
    sessionStorage.setItem('active_firm_id', firmFromSub);
    return firmFromSub;
  }

  // Otherwise (e.g. localhost or plain root domain), support session-based or query-based tenant
  const sessionSub = sessionStorage.getItem('active_subdomain');
  if (sessionSub && sessionSub.toLowerCase() !== sub.toLowerCase()) {
    sessionStorage.removeItem('active_firm_id');
    sessionStorage.setItem('active_subdomain', sub);
  }

  const sessionFirm = sessionStorage.getItem('active_firm_id');
  if (sessionFirm) return sessionFirm.trim().toUpperCase();
  return (sub || 'shree').trim().toUpperCase();
};

// 🛡️ 1. Global Axios Default & Interceptor
const initialFirm = getCurrentFirmId();
axios.defaults.headers.common['X-Firm-ID'] = initialFirm;

axios.interceptors.request.use((config) => {
  const firmId = getCurrentFirmId();
  const username = (typeof window !== 'undefined' && sessionStorage.getItem('username')) || '';
  config.headers = config.headers || {};
  config.headers['X-Firm-ID'] = firmId;
  if (username) {
    config.headers['X-Username'] = username;
  }

  // Also inject ?firm_id= into query params for every axios call if neither firm_id nor subdomain is present
  config.params = config.params || {};
  const hasSubInUrl = typeof config.url === 'string' && config.url.includes('subdomain=');
  const hasFirmInUrl = typeof config.url === 'string' && config.url.includes('firm_id=');
  if (!config.params.firm_id && !config.params.subdomain && !hasSubInUrl && !hasFirmInUrl) {
    config.params.firm_id = firmId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 🛡️ 2. Global Native window.fetch Interceptor
// Injects X-Firm-ID header & firm_id query parameter into every browser fetch call
if (typeof window !== 'undefined' && window.fetch && !window.__fetch_firm_intercepted) {
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    const firmId = getCurrentFirmId();
    const username = (typeof window !== 'undefined' && sessionStorage.getItem('username')) || '';
    
    // Prepare cloned options
    const newOptions = { ...options };
    
    // Normalize and inject X-Firm-ID & X-Username headers
    if (newOptions.headers instanceof Headers) {
      if (!newOptions.headers.has('X-Firm-ID')) {
        newOptions.headers.set('X-Firm-ID', firmId);
      }
      if (username && !newOptions.headers.has('X-Username')) {
        newOptions.headers.set('X-Username', username);
      }
    } else if (Array.isArray(newOptions.headers)) {
      const hasHeader = newOptions.headers.some(([k]) => k.toLowerCase() === 'x-firm-id');
      if (!hasHeader) {
        newOptions.headers.push(['X-Firm-ID', firmId]);
      }
      if (username && !newOptions.headers.some(([k]) => k.toLowerCase() === 'x-username')) {
        newOptions.headers.push(['X-Username', username]);
      }
    } else {
      newOptions.headers = {
        'X-Firm-ID': firmId,
        ...(username ? { 'X-Username': username } : {}),
        ...(newOptions.headers || {})
      };
    }

    // Append ?firm_id= if URL is an API/sales call and doesn't already have firm_id/subdomain param
    let finalUrl = url;
    if (typeof url === 'string') {
      try {
        const dummyBase = 'http://localhost';
        const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
        const urlObj = isAbsolute ? new URL(url) : new URL(url, dummyBase);
        
        const path = urlObj.pathname.toLowerCase();
        if (path.includes('/api/') || path.includes('/sales') || path.includes('/store/')) {
          if (!urlObj.searchParams.has('firm_id') && !urlObj.searchParams.has('subdomain')) {
            urlObj.searchParams.set('firm_id', firmId);
            finalUrl = isAbsolute ? urlObj.toString() : (urlObj.pathname + urlObj.search + urlObj.hash);
          }
        }
      } catch (_) {
        // In case URL parsing fails, retain original URL
      }
    }

    // If options.body is a JSON string without firm_id, inject it
    if (newOptions.body && typeof newOptions.body === 'string' && newOptions.body.startsWith('{')) {
      try {
        const parsed = JSON.parse(newOptions.body);
        if (parsed && typeof parsed === 'object' && !parsed.firm_id) {
          parsed.firm_id = firmId;
          newOptions.body = JSON.stringify(parsed);
        }
      } catch (_) {}
    }

    return originalFetch.call(this, finalUrl, newOptions);
  };
  window.__fetch_firm_intercepted = true;
}

export default baseURL;
