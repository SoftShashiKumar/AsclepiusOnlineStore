import React from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { FaLeaf, FaFlask, FaHandHoldingHeart, FaAward, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock } from 'react-icons/fa';
import './AboutUs.css';

const AboutUs = () => {
    const { firmProfile, loading } = useContext(FirmProfileContext);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Details...</div>;
    }
    return (
        <div className="about-container">
            {/* 1. Hero Video Section */}
            <div className="about-hero">
                <video autoPlay loop muted playsInline className="hero-bg-video">
                    <source src="https://res.cloudinary.com/qujxcplu/video/upload/v1791470537/Asclepius/about_video.mp4" type="video/mp4" />
                </video>
            </div>
            
            {/* 1.5 Hero Text Strip */}
            <div className="about-hero-strip">
                <h5>HEALTH & WEALTH</h5>
                <h1>Ayurveda Backed By <span>Modern Science</span></h1>
                <p>Promoting a healthier lifestyle with Asclepius Wellness products.</p>
            </div>

            {/* 2. Our Story Section */}
            <div className="about-section story-section">
                <div className="about-grid">
                    <div className="story-text">
                        <span className="sub-heading">ABOUT ASCLEPIUS WELLNESS</span>
                        <h2>Combining Tradition with Modern Biotechnology</h2>
                        <p>
                            <strong>Asclepius Wellness Private Limited (AWPL)</strong> is a prominent Indian direct selling company established in 2014. We specialize in producing and distributing premium Ayurvedic, herbal, and wellness products designed to promote healthier lifestyles. 
                        </p>
                        <p>
                            Our mission is to bring the ancient wisdom of Ayurveda into the modern world by combining it with cutting-edge biotechnology. We believe in providing natural, safe, and effective solutions for daily health and personal care needs. All our manufacturing processes strictly adhere to GMP, FSSAI, and other regulatory standards to ensure the highest quality.
                        </p>
                        <div className="founder-quote">
                            <p>"Our vision is to build a healthy India and provide an economic platform for individuals to achieve financial independence through wellness."</p>
                            <span>— Asclepius Wellness</span>
                        </div>
                    </div>
                    <div className="story-image-card">
                        <div className="image-placeholder">
                            <div className="placeholder-content">
                                <h3>{firmProfile?.firm_name || 'Shree Wellness Centre'}</h3>
                                <p>Authorized C&F / Distributor</p>
                                <span>📍 {firmProfile?.address_line_1 || 'Sudama Tara Kunj, Bharat Mata Chowk'}, {firmProfile?.address_line_2 || 'Bari khanjarur - 1'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Core Values Section */}
            <div className="about-section values-section">
                <div className="values-header">
                    <span className="sub-heading">WHY CHOOSE US</span>
                    <h2>Our Core Values</h2>
                </div>
                <div className="values-grid">
                    <div className="value-box">
                        <div className="icon-wrapper"><FaLeaf /></div>
                        <h3>Pure Ayurveda</h3>
                        <p>We use 100% natural herbs and traditional Ayurvedic formulations for true wellness.</p>
                    </div>
                    <div className="value-box">
                        <div className="icon-wrapper"><FaFlask /></div>
                        <h3>Scientific Approach</h3>
                        <p>Ancient Ayurvedic wisdom is backed by modern scientific research and biotechnology.</p>
                    </div>
                    <div className="value-box">
                        <div className="icon-wrapper"><FaAward /></div>
                        <h3>Certified Quality</h3>
                        <p>Products are manufactured in state-of-the-art facilities following GMP & FSSAI guidelines.</p>
                    </div>
                    <div className="value-box">
                        <div className="icon-wrapper"><FaHandHoldingHeart /></div>
                        <h3>Empowerment</h3>
                        <p>Providing opportunities for financial growth while spreading the message of good health.</p>
                    </div>
                </div>
            </div>

            {/* 4. Contact & Info Section */}
            <div className="about-section contact-info-section">
                <div className="contact-grid">
                    <div className="contact-card">
                        <h3>Visit Our Store</h3>
                        <p>Experience our wide range of health, beauty, and personal care products.</p>
                        <ul className="info-list">
                            <li>
                                <FaMapMarkerAlt className="info-icon" />
                                <div>
                                    <strong>Address:</strong>
                                    <span>{firmProfile?.address_line_1 || 'Sudama Tara Kunj, Bharat Mata Chowk, Bargachh'}, {firmProfile?.address_line_2 || 'Bari khanjarur - 1'}</span>
                                </div>
                            </li>
                            <li>
                                <FaClock className="info-icon" />
                                <div>
                                    <strong>Business Hours:</strong>
                                    <span>Monday - Sunday: 9:00 AM - 8:00 PM</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="contact-card">
                        <h3>Get In Touch</h3>
                        <p>Have questions about products or direct selling? We are here to help.</p>
                        <ul className="info-list">
                            <li>
                                <FaPhoneAlt className="info-icon" />
                                <div>
                                    <strong>Phone:</strong>
                                    <span>{firmProfile?.contact_number || '+91 99999 99999'}</span>
                                </div>
                            </li>
                            <li>
                                <FaEnvelope className="info-icon" />
                                <div>
                                    <strong>Email:</strong>
                                    <span>{firmProfile?.email || 'info@asclepiuswellness.com'}</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 5. Call to Action */}
            <div className="about-cta">
                <h2>Begin Your Journey to Better Health</h2>
                <p>Explore our latest products and start living a healthier life today.</p>
                <Link to="/collection" className="btn-primary">Explore Products</Link>
            </div>
        </div>
    );
};

export default AboutUs;