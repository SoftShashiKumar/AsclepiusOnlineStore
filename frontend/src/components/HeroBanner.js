import React from 'react';
import { Link } from 'react-router-dom'; // 1. Link ko yahan import karein
import './HeroBanner.css';

const HeroBanner = () => {
    return (
        <div className="hero-container">
            <div className="hero-overlay"></div>
            <div className="hero-content">
                {/* <h5>TRADITION MEETS LUXURY</h5> */}
                <h1>Asclepius<br /><span className="wellness-text">Empowering Wellness</span></h1>
                <p>Utilizing the principles of Ayurveda for a better, stronger, and more balanced lifestyle.</p>
                <div className="hero-buttons">
                    {/* 2. Button ko Link tag se wrap kar dein */}
                    <Link to="/collection">
                        <button className="btn-primary">Open Store</button>
                    </Link>
                    {/* <button className="btn-secondary">Book Consultation</button> */}
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;