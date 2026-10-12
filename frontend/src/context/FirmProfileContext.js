import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig'; // Tumhara base URL import

export const FirmProfileContext = createContext();

export const FirmProfileProvider = ({ children }) => {
    const [firmProfile, setFirmProfile] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // App khulte hi API se data mangwao
        axios.get(`${baseURL}/api/firm-profile/`)
            .then(response => {
                if (response.data.success) {
                    setFirmProfile(response.data.data);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching firm profile:", error);
                setLoading(false);
            });
    }, []);

    return (
        <FirmProfileContext.Provider value={{ firmProfile, loading }}>
            {children}
        </FirmProfileContext.Provider>
    );
};