import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Link to the Login.css

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const navigate = useNavigate();

  // useEffect for initial load animations on this page
  useEffect(() => {
    const elementsToAnimateOnLoad = document.querySelectorAll('.animate-on-load');
    elementsToAnimateOnLoad.forEach(el => {
        const delay = el.dataset.delay || '0s';
        el.style.transitionDelay = delay;
        
        // A small timeout can help ensure styles are applied before class for transition
        // This is a common trick if direct class addition doesn't trigger transition
        setTimeout(() => {
             el.classList.add('is-visible');
        }, 50); 
    });
  }, []); // Empty dependency array: runs once on mount


  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(''); 
    setIsLoggingIn(true);

    try {
      if (!emailOrUsername || !password) {
        setMessage('Please enter both email/username and password.');
        setIsLoggingIn(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const userRes = await fetch('http://localhost:5001/users');
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(`Failed to fetch users: ${errorData.message || userRes.statusText}`);
      }
      const users = await userRes.json();

      const ownerUser = users.find(
        (u) =>
          u.role === 'owner' &&
          (u.email?.toLowerCase() === emailOrUsername.toLowerCase() ||
           u.username?.toLowerCase() === emailOrUsername.toLowerCase()) &&
          u.password === password
      );

      if (ownerUser) {
        setMessage(`Welcome, Owner!`);
        setTimeout(() => navigate(`/OwnerDashboard/${ownerUser.id}`), 1000);
        // Not setting setIsLoggingIn(false) because we navigate
        return;
      }

      const propRes = await fetch('http://localhost:5001/properties');
      if (!propRes.ok) {
        const errorData = await propRes.json();
        throw new Error(`Failed to fetch properties: ${errorData.message || propRes.statusText}`);
      }
      const properties = await propRes.json();
      let foundTenant = null;
      let propertyIdForTenant = null;

      for (let property of properties) {
        if (!property.tenants || !Array.isArray(property.tenants)) continue;
        const tenant = property.tenants.find(
          (t) => 
            t.username?.toLowerCase() === emailOrUsername.toLowerCase() && 
            t.password === password
        );
        if (tenant) {
          foundTenant = tenant;
          propertyIdForTenant = property.id;
          break;
        }
      }

      if (foundTenant && propertyIdForTenant) {
        setMessage(`Welcome, Tenant!`);
        setTimeout(() => navigate(`/TenantDashboard/${propertyIdForTenant}/${foundTenant.flatNo}`), 1000);
        // Not setting setIsLoggingIn(false) because we navigate
        return;
      } else {
        setMessage('Invalid email/username or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`Login failed: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
        // Only set to false if we are NOT navigating away (i.e., login failed or validation error)
        // Check if message still indicates an error or non-welcome state
        if (message !== `Welcome, Owner!` && message !== `Welcome, Tenant!`) {
             setIsLoggingIn(false);
        }
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-bg-shape shape1"></div>
      <div className="login-bg-shape shape2"></div>
      <div className="login-bg-shape shape3"></div>
      <div className="login-bg-shape shape4"></div>

      <div className="login-container animate-on-load" data-animation="fadeInUp"> {/* Container also animates in */}
        <div className="login-header">
            <svg width="48" height="40" viewBox="0 0 36 30" className="login-logo-icon animate-on-load" data-animation="scaleUp" data-delay="0.1s" aria-hidden="true">
              <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#334155"/>
              <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50"/>
            </svg>
            <h2 className="login-title animate-on-load" data-animation="fadeInUp" data-delay="0.2s">
                Welcome to RentCare
            </h2>
            <p className="login-subtitle animate-on-load" data-animation="fadeInUp" data-delay="0.3s">
                Sign in to continue
            </p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group animate-on-load" data-animation="fadeInUp" data-delay="0.4s">
            <label htmlFor="emailOrUsername">Email or Username</label>
            <input
              id="emailOrUsername"
              type="text"
              placeholder="e.g., user@example.com"
              className="login-input"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>
          <div className="input-group animate-on-load" data-animation="fadeInUp" data-delay="0.5s">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>
          <button 
            type="submit" 
            className={`login-button animate-on-load ${isLoggingIn ? 'logging-in' : ''}`} 
            data-animation="fadeInUp" 
            data-delay="0.6s"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="spinner"></span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {message && (
            <p className={`login-message ${message.startsWith('Welcome') ? 'success' : 'error'}`}>
                {message}
            </p>
        )}
      </div>
    </div>
  );
};

export default Login;