// frontend/src/utils/subdomain.js

/**
 * Checks whether the current hostname has an explicit multi-tenant subdomain.
 * Examples:
 *   shree.asclepiusstore.in -> true
 *   demo.asclepiusstore.in  -> true
 *   asclepiusstore.in       -> false
 *   localhost               -> false
 */
export const isRealSubdomainHost = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if ((parts.length >= 3) || (parts.length === 2 && parts[1] === 'localhost')) {
        const sub = parts[0];
        return sub !== 'www' && sub !== 'api' && sub !== 'backend';
    }
    return false;
};

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

    const hostname = window.location.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. First priority: Real subdomain in hostname
    // Examples:
    //   demo.asclepiusstore.in -> "demo"
    //   shree.asclepiusstore.in -> "shree"
    //   demo.localhost:3000 -> "demo"
    const parts = hostname.split('.');
    if ((parts.length >= 3) || (parts.length === 2 && parts[1] === 'localhost')) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'api') {
            return sub;
        }
    }

    // 2. Second priority: Query param override (e.g. ?firm=demo or ?subdomain=demo)
    const urlParams = new URLSearchParams(window.location.search);
    const queryFirm = urlParams.get('firm') || urlParams.get('subdomain') || urlParams.get('firm_id');
    if (queryFirm) {
        const clean = queryFirm.trim().toLowerCase();
        sessionStorage.setItem('active_subdomain_session', clean);
        return clean;
    }

    // 3. Third priority: Session storage (tab-scoped)
    const sessionOverride = sessionStorage.getItem('active_subdomain_session');
    if (sessionOverride) return sessionOverride;

    // 4. If testing locally on plain localhost, check legacy saved dev override
    if (isLocal) {
        const savedOverride = localStorage.getItem('active_subdomain_override');
        if (savedOverride) return savedOverride;
    }

    // Default fallback to 'shree'
    return 'shree';
};
