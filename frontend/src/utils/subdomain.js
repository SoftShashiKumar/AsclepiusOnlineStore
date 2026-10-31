// frontend/src/utils/subdomain.js

/**
 * Extracts and returns the active tenant/firm subdomain.
 * Examples:
 *   shree.asclepiusstore.in -> "shree"
 *   demo.asclepiusstore.in  -> "demo"
 *   shree.localhost:3000    -> "shree"
 *   localhost:3000?firm=demo -> "demo" (for quick dev testing)
 */
export const getActiveSubdomain = () => {
    if (typeof window === 'undefined') return 'shree';

    // 1. Query param override (e.g. ?firm=demo or ?subdomain=demo)
    const urlParams = new URLSearchParams(window.location.search);
    const queryFirm = urlParams.get('firm') || urlParams.get('subdomain');
    if (queryFirm) {
        const clean = queryFirm.trim().toLowerCase();
        localStorage.setItem('active_subdomain_override', clean);
        return clean;
    }

    const hostname = window.location.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // 2. Check if host has subdomain:
    // e.g. "shree.asclepiusstore.in" -> parts: ["shree", "asclepiusstore", "in"]
    // e.g. "shree.localhost" -> parts: ["shree", "localhost"]
    const parts = hostname.split('.');
    if ((parts.length >= 3) || (parts.length === 2 && parts[1] === 'localhost')) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'api') {
            return sub;
        }
    }

    // 3. If testing locally on plain localhost, check saved dev override
    if (isLocal) {
        const savedOverride = localStorage.getItem('active_subdomain_override');
        if (savedOverride) return savedOverride;
    }

    // Default fallback to 'shree'
    return 'shree';
};
