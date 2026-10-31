import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import { getActiveSubdomain } from '../utils/subdomain';

export const FirmProfileContext = createContext();

export const FirmProfileProvider = ({ children }) => {
    const [firmProfile, setFirmProfile] = useState({});
    const [subdomain, setSubdomain] = useState(getActiveSubdomain());
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const activeSub = getActiveSubdomain();
        setSubdomain(activeSub);

        // Pre-set header with fallback
        axios.defaults.headers.common['X-Firm-ID'] = activeSub.toUpperCase();

        // Subdomain ke aadhar par firm profile fetch karna
        axios.get(`${baseURL}/api/firm-profile/?subdomain=${encodeURIComponent(activeSub)}`)
            .then(response => {
                if (response.data && response.data.success) {
                    const resData = response.data.data;
                    if (resData && resData.firm_name) {
                        resData.firm_name = resData.firm_name.replace(/\bCentre\b/gi, 'Center');
                    }
                    setFirmProfile(resData);
                    
                    const firmId = resData.firm_id || activeSub.toUpperCase();
                    sessionStorage.setItem('active_firm_id', firmId);
                    sessionStorage.setItem('active_subdomain', activeSub);
                    
                    // Attach X-Firm-ID header to all upcoming axios requests
                    axios.defaults.headers.common['X-Firm-ID'] = firmId;
                } else {
                    setNotFound(true);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching firm profile:", error);
                if (error.response && error.response.status === 404) {
                    setNotFound(true);
                }
                setLoading(false);
            });
    }, []);

    // Global Axios Interceptor to guarantee X-Firm-ID is always present
    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use((config) => {
            const fid = firmProfile.firm_id || sessionStorage.getItem('active_firm_id') || subdomain.toUpperCase();
            if (fid) {
                config.headers['X-Firm-ID'] = fid;
            }
            return config;
        }, (error) => Promise.reject(error));

        return () => {
            axios.interceptors.request.eject(reqInterceptor);
        };
    }, [firmProfile, subdomain]);

    if (notFound) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                fontFamily: 'sans-serif'
            }}>
                <div style={{
                    maxWidth: '460px',
                    padding: '32px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
                }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Store Not Found</h2>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                        The store <strong>"{subdomain}"</strong> does not exist or has been deactivated.
                    </p>
                    <a href="https://asclepiusstore.in" style={{
                        display: 'inline-block',
                        marginTop: '16px',
                        padding: '10px 20px',
                        background: '#0284c7',
                        color: '#fff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600'
                    }}>
                        Visit Main Store
                    </a>
                </div>
            </div>
        );
    }

    return (
        <FirmProfileContext.Provider value={{ 
            firmProfile, 
            loading, 
            subdomain,
            firmId: firmProfile.firm_id || subdomain.toUpperCase() 
        }}>
            {children}
        </FirmProfileContext.Provider>
    );
};
