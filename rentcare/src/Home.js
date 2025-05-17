import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

// Placeholder for icons - ideally, use an icon library like React Icons
const FeatureIcon = ({ color = "#FF7F50" }) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feature-icon">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path> {/* Shield Icon Example */}
  </svg>
);
const PaymentIcon = ({ color = "#FF7F50" }) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feature-icon">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);
const CommunicationIcon = ({ color = "#FF7F50" }) => (
 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feature-icon">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);


const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    // console.log('Found animated elements:', animatedElements.length); // For debugging

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // observer.unobserve(entry.target); // Optional: unobserve after first animation
          }
          // else { // Optional: re-animate on scroll out and back in
          //   entry.target.classList.remove('is-visible');
          // }
        });
      },
      {
        rootMargin: '0px',
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    animatedElements.forEach((el) => {
      const delay = el.dataset.delay;
      if (delay) {
        el.style.transitionDelay = delay;
      }
      observer.observe(el);
    });

    return () => {
      animatedElements.forEach((el) => {
        if (observer && el) { // Check if observer and el still exist
            observer.unobserve(el);
        }
      });
    };
  }, []); // Empty dependency array means this runs once on mount

  const handleNavigate = (path) => {
    navigate(path);
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="page-container">
      <div className="hero-view-wrapper">
        {/* Background Decorative Elements */}
        <div className="background-elements">
          <div className="bg-wave-orange"></div>
          <div className="bg-rings-container">
            <div className="ring-layer" id="ring1"></div>
            <div className="ring-layer" id="ring2"></div>
            <div className="ring-layer" id="ring3"></div>
          </div>
        </div>

        <div className="small-circle circle-1 animate-on-scroll" data-animation="scaleUp" data-delay="0.7s"></div>
        <div className="small-circle circle-2 animate-on-scroll" data-animation="scaleUp" data-delay="0.8s"></div>

        <header className="main-header animate-on-scroll" data-animation="fadeInDown" data-delay="0.1s">
          <div className="logo">
            <svg width="36" height="30" viewBox="0 0 36 30" className="logo-icon" aria-hidden="true">
              <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#2c2c2c"/>
              <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF8C42"/>
            </svg>
            <span className="brand-name-text">RentCare</span>
          </div>
          <nav className="main-nav">
            <a href="#about-us-section" onClick={(e) => { e.preventDefault(); scrollToSection('about-us-section'); }}>About Us</a>
            <a href="#contact-us-section" onClick={(e) => { e.preventDefault(); scrollToSection('contact-us-section'); }}>Contact Us</a>
          </nav>
        </header>

        <main className="hero-section animate-on-scroll" data-animation="fadeInUp" data-delay="0.2s">
          <div className="hero-content-wrapper">
            <div className="hero-text-content">
              <h1 className="hero-title animate-on-scroll" data-animation="fadeInUp" data-delay="0.3s">
                Modern Renting. <br />
                Made Easy.
              </h1>
              <p className="hero-description animate-on-scroll" data-animation="fadeInUp" data-delay="0.4s">
                RentCare is your all-in-one platform for effortless property management,
                seamless communication, and secure rent handling for landlords and tenants.
              </p>
              <div className="hero-actions animate-on-scroll" data-animation="fadeInUp" data-delay="0.5s">
                <button onClick={() => handleNavigate('/login')} className="btn-hero btn-primary-hero">Login</button>
                <button onClick={() => handleNavigate('/admin')} className="btn-hero btn-secondary-hero">Admin Panel</button>
              </div>
            </div>
          </div>
        </main>
      </div> {/* End of hero-view-wrapper */}

      <section id="about-us-section" className="content-section about-us">
        <h2 className="section-heading animate-on-scroll" data-animation="fadeInUp">About RentCare</h2>
        <p className="section-paragraph intro-paragraph animate-on-scroll" data-animation="fadeInUp" data-delay="0.1s">
          Founded with a vision to simplify the complexities of property rentals, RentCare offers a comprehensive,
          user-friendly platform for both landlords and tenants. We believe in transparency, efficiency,
          and fostering positive rental experiences through technology.
        </p>

        <h2 className="section-heading features-heading animate-on-scroll" data-animation="fadeInUp" data-delay="0.2s">Why RentCare?</h2>
        <p className="section-subheading animate-on-scroll" data-animation="fadeInUp" data-delay="0.3s">
          Streamlining the rental experience for everyone involved with powerful, intuitive features.
        </p>
        <div className="features-grid">
          <div className="feature-card animate-on-scroll" data-animation="fadeInUp" data-delay="0.4s">
            <div className="feature-card-icon-wrapper">
              <PaymentIcon />
            </div>
            <h3 className="feature-card-title">Effortless Payments</h3>
            <p className="feature-card-description">
              Secure online rent collection for landlords and convenient payment options for tenants. Track payment history with ease.
            </p>
          </div>
          <div className="feature-card animate-on-scroll" data-animation="fadeInUp" data-delay="0.5s">
            <div className="feature-card-icon-wrapper">
              <CommunicationIcon />
            </div>
            <h3 className="feature-card-title">Seamless Communication</h3>
            <p className="feature-card-description">
              Centralized messaging, announcements, and document sharing. Keep everyone informed and connected.
            </p>
          </div>
          <div className="feature-card animate-on-scroll" data-animation="fadeInUp" data-delay="0.6s">
            <div className="feature-card-icon-wrapper">
              <FeatureIcon /> {/* Replace with a more specific icon for Property Management */}
            </div>
            <h3 className="feature-card-title">Smart Management</h3>
            <p className="feature-card-description">
              Manage properties, tenant details, lease agreements, and maintenance requests all from one dashboard.
            </p>
          </div>
        </div>
      </section>

      <section id="contact-us-section" className="content-section contact-us">
        <h2 className="section-heading animate-on-scroll" data-animation="fadeInUp">Get In Touch</h2>
        <p className="section-subheading contact-subheading animate-on-scroll" data-animation="fadeInUp" data-delay="0.05s"> {/* Added a subheading here */}
            We're here to help and answer any question you might have. We look forward to hearing from you!
        </p>
        <div className="contact-info-wrapper animate-on-scroll" data-animation="fadeInUp" data-delay="0.1s">
            <div className="contact-method">
                <span className="contact-icon-placeholder">📧</span> {/* Placeholder, replace with actual icon */}
                <span className="contact-label">Email:</span>
                <a href="mailto:support@rentcare.com" className="contact-link">support@rentcare.com</a>
            </div>
            <div className="contact-method">
                <span className="contact-icon-placeholder">📞</span> {/* Placeholder */}
                <span className="contact-label">Phone:</span>
                <span className="contact-value">(555) RENT-CARE</span>
            </div>
            <div className="contact-method">
                <span className="contact-icon-placeholder">📍</span> {/* Placeholder */}
                <span className="contact-label">Address:</span>
                <span className="contact-value">123 Innovation Drive, Tech City, TC 54321</span>
            </div>
        </div>
      </section>

      <footer className="page-footer animate-on-scroll" data-animation="fadeInUp" data-delay="0.2s">
        <div className="footer-content">
            <p>© {new Date().getFullYear()} <span className="copyright-brand">RentCare</span>. All Rights Reserved.</p>
            {/* You can add more footer links or social icons here if desired */}
            {/* <div className="footer-links">
                <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a>
            </div> */}
        </div>
      </footer>
    </div>
  );
};

export default Home;