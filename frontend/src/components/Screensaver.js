import React, { useState, useEffect } from 'react';
import './Screensaver.css';

const Screensaver = () => {
    const [isActive, setIsActive] = useState(false);
    
    // Read settings from localStorage
    const getSettings = () => {
        const enabled = localStorage.getItem('screensaver_enabled');
        const timeout = localStorage.getItem('screensaver_timeout');
        return {
            enabled: enabled !== null ? JSON.parse(enabled) : true,
            timeout: timeout ? parseInt(timeout, 10) : 15 // Default 15 seconds
        };
    };

    useEffect(() => {
        let timer;
        const resetTimer = () => {
            setIsActive(false);
            clearTimeout(timer);
            
            const settings = getSettings();
            if (settings.enabled) {
                timer = setTimeout(() => {
                    setIsActive(true);
                }, settings.timeout * 1000);
            }
        };

        // Events that reset the timer
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        // Initial setup
        resetTimer();

        // Listen for custom event from settings modal to immediately update settings
        window.addEventListener('screensaverSettingsChanged', resetTimer);

        return () => {
            clearTimeout(timer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
            window.removeEventListener('screensaverSettingsChanged', resetTimer);
        };
    }, []);

    if (!isActive) return null;

    return (
        <div className="screensaver-overlay">
            <video autoPlay loop muted playsInline className="screensaver-video">
                <source src="https://res.cloudinary.com/qujxcplu/video/upload/v1791470537/Asclepius/about_video.mp4" type="video/mp4" />
            </video>
            <div className="screensaver-content">
                <img src="https://www.asclepiuswellness.com/images/logo/logow.png" alt="Asclepius Wellness Logo" style={{ maxWidth: '300px', height: 'auto', display: 'block', margin: '0 auto' }} />
            </div>
        </div>
    );
};

export default Screensaver;
