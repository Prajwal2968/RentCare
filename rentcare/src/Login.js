import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Link to the Login.css

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const elementsToAnimateOnLoad = document.querySelectorAll('.animate-on-load');
    elementsToAnimateOnLoad.forEach(el => {
      const delay = el.dataset.delay || '0s';
      el.style.transitionDelay = delay;
      setTimeout(() => {
        el.classList.add('is-visible');
      }, 50);
    });
  }, []);


  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoggingIn(true);

    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Please check environment variables.');
        setIsLoggingIn(false);
        console.error("REACT_APP_API_BASE_URL is not set");
        return;
    }

    try {
      if (!emailOrUsername || !password) {
        setMessage('Please enter both email/username and password.');
        setIsLoggingIn(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1500));

      const userRes = await fetch(`${API_BASE_URL}/users`); // MODIFIED URL
      if (!userRes.ok) {
        let errorData;
        try {
            errorData = await userRes.json();
        } catch (jsonError) {
            // If response is not JSON, use statusText
            throw new Error(`Failed to fetch users: ${userRes.statusText}`);
        }
        throw new Error(`Failed to fetch users: ${errorData.message || userRes.statusText}`);
      }
      const users = await userRes.json();

      const ownerUser = users.find(
        (u) =>
          u.role === 'owner' &&
          (u.email?.toLowerCase() === emailOrUsername.toLowerCase() ||
           u.username?.toLowerCase() === emailOrUsername.toLowerCase()) &&
          u.password === password // Note: Storing/comparing plain text passwords is insecure
      );

      if (ownerUser) {
        setMessage(`Welcome, Owner!`);
        setTimeout(() => navigate(`/OwnerDashboard/${ownerUser.id}`), 1000);
        return;
      }

      const propRes = await fetch(`${API_BASE_URL}/properties`); // MODIFIED URL
      if (!propRes.ok) {
        let errorData;
        try {
            errorData = await propRes.json();
        } catch (jsonError) {
            throw new Error(`Failed to fetch properties: ${propRes.statusText}`);
        }
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
            t.password === password // Note: Storing/comparing plain text passwords is insecure
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
        return;
      } else {
        setMessage('Invalid email/username or password.');
        // Make sure to set isLoggingIn to false here if no navigation occurs
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`Login failed: ${error.message || 'An unexpected error occurred.'}`);
      setIsLoggingIn(false); // Ensure spinner stops on error
    } finally {
        // The setIsLoggingIn(false) is handled more specifically above now,
        // but we can keep a general one if the specific conditions aren't met.
        // This might be redundant now with the more specific error/failure handling.
        // if (message !== `Welcome, Owner!` && message !== `Welcome, Tenant!`) {
        //      setIsLoggingIn(false);
        // }
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-bg-shape shape1"></div>
      <div className="login-bg-shape shape2"></div>
      <div className="login-bg-shape shape3"></div>
      <div className="login-bg-shape shape4"></div>

      <div className="login-container animate-on-load" data-animation="fadeInUp">
        <div className="login-header">
          <svg width="48" height="40" viewBox="0 0 36 30" className="login-logo-icon animate-on-load" data-animation="scaleUp" data-delay="0.1s" aria-hidden="true">
            <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#334155" />
            <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50" />
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
