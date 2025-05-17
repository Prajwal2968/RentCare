import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css";

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Ensure this is your Stripe Publishable Key
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""; // Default to empty string
const stripePromise = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_')
    ? loadStripe(STRIPE_PUBLISHABLE_KEY)
    : Promise.resolve(null);


function TenantDashboard() {
  const { propertyId, flatNo } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState(""); // General operational messages
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfigError, setIsConfigError] = useState(false);
  const [configErrorMessage, setConfigErrorMessage] = useState(""); // Specific for config issues

  useEffect(() => {
    console.log("TenantDashboard Mounted. PARAMS:", { propertyId, flatNo });
    console.log("ENV VARS - API_BASE_URL:", API_BASE_URL);
    console.log("ENV VARS - STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

    const elementsToAnimate = document.querySelectorAll('.tenant-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => {
          el.classList.add('is-visible');
        }, delay + index * 50);
      }
    });
  }, []);


  useEffect(() => {
    setLoading(true);
    setMessage(''); // Clear general messages
    setConfigErrorMessage(""); // Clear specific config error message
    setIsConfigError(false);

    let currentConfigIssue = "";

    if (!API_BASE_URL) {
      currentConfigIssue = 'Configuration Error: API URL is not set. Please contact support.';
      console.error("CRITICAL: REACT_APP_API_BASE_URL is not set in environment variables.");
    } else if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      currentConfigIssue = 'Configuration Error: Stripe is not configured correctly. Payment functionality will be disabled.';
      console.error("CRITICAL: REACT_APP_STRIPE_PUBLISHABLE_KEY is not set or is invalid.");
    }

    if (currentConfigIssue) {
        setConfigErrorMessage(currentConfigIssue); // Set specific config error message
        setIsConfigError(true);
        setLoading(false);
        if (!API_BASE_URL) return; // Hard stop if API URL is the issue, Stripe issue can allow page to load mostly
    }

    if (!propertyId || !flatNo) {
      const urlErrorMsg = "Error: Invalid navigation parameters. Property ID or Flat No missing from URL.";
      setConfigErrorMessage(urlErrorMsg); // Treat as a config/navigation error
      setIsConfigError(true);
      setLoading(false);
      return;
    }

    // Only proceed if API_BASE_URL is set
    if (API_BASE_URL) {
        fetch(`${API_BASE_URL}/properties/${propertyId}`)
        .then((res) => {
            if (!res.ok) {
            return res.json().then(errData => {
                throw new Error(errData.message || `Failed to fetch property data (Status: ${res.status})`);
            }).catch(() => {
                throw new Error(`Failed to fetch property data (Status: ${res.status}, not JSON response)`);
            });
            }
            return res.json();
        })
        .then((data) => {
            if (!data || typeof data !== 'object') { // More robust check for data
                throw new Error("Property data received is invalid or empty.");
            }
            setProperty(data);
            const matchedTenant = data.tenants?.find(t => t.flatNo === flatNo);

            if (!matchedTenant) {
            throw new Error(`Tenant for Flat No: "${flatNo}" not found in property: "${data.name || propertyId}". Check login details or property data.`);
            }
            setTenant(matchedTenant);
        })
        .catch((error) => {
            console.error("Error loading tenant/property data:", error);
            // Set general message for data loading errors, config error is handled above
            setMessage(`Error loading dashboard: ${error.message}.`);
        })
        .finally(() => {
            setLoading(false);
        });
    } else {
        // This case should ideally be caught by the API_BASE_URL check above,
        // but as a fallback:
        setLoading(false);
        if (!isConfigError) { // If not already set by the API_BASE_URL check
            setConfigErrorMessage('Configuration Error: API URL missing, cannot fetch data.');
            setIsConfigError(true);
        }
    }
  }, [propertyId, flatNo]); // API_BASE_URL and STRIPE_PUBLISHABLE_KEY are module-level, not reactive props here


  const handlePayRent = async () => {
    console.log('--- handlePayRent Initiated ---');
    console.log('1. API_BASE_URL:', API_BASE_URL);
    console.log('2. STRIPE_PUBLISHABLE_KEY:', STRIPE_PUBLISHABLE_KEY);
    console.log('3. Tenant Data:', JSON.stringify(tenant)); // Stringify for better object view
    console.log('4. Property Data:', JSON.stringify(property)); // Stringify
    console.log('5. Tenant Rent Amount:', tenant ? tenant.rentAmount : 'N/A');

    // Re-check critical configs before proceeding
    if (!API_BASE_URL || !STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Configuration error prevents payment. Please contact support.');
        console.error("Payment ABORTED: Critical configuration missing (API URL or Stripe Key).");
        return;
    }
    if (!tenant || !property || !tenant.rentAmount || tenant.rentAmount <= 0) {
      setMessage("Tenant data or rent amount is missing or invalid. Cannot proceed with payment.");
      console.error("Payment ABORTED: Missing tenant, property, or valid rentAmount.", {tenant, property});
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    setIsActionLoading(true);
    setMessage("Initializing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe.js could not be loaded. This might be due to an invalid Stripe key or network issues. Please try again or contact support.");
        console.error("Payment ABORTED: Stripe.js failed to load (stripe object is null).");
        setIsActionLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      console.log('6. Stripe.js loaded successfully.');

      const requestBody = {
        tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email || `${tenant.username || tenant.flatNo}-tenant@example.com` },
        propertyId: property.id,
        propertyName: property.name,
      };
      console.log('7. Attempting to create Stripe session with body:', JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('8. Create session backend response status:', response.status);
      const responseText = await response.text(); // Get text first to avoid parse error if not JSON
      if (!response.ok) {
        let errorData = { error: `Server error (Status: ${response.status}). Response: ${responseText}` };
        try { errorData = JSON.parse(responseText); } catch (e) { /* Keep default error if not JSON */ }
        console.error('Payment ERROR: Server error during create-checkout-session:', errorData);
        throw new Error(errorData.error || `Failed to create Stripe payment session (Status: ${response.status}). Please try again.`);
      }
      const session = JSON.parse(responseText);
      console.log('9. Session object received from backend:', session);

      if (!session || !session.id) {
        console.error('Payment ERROR: Invalid session object or session.id missing from backend response:', session);
        throw new Error("Received an invalid session from the server. Cannot proceed with payment.");
      }

      console.log('10. Redirecting to Stripe Checkout with session ID:', session.id);
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        console.error('Payment ERROR: Stripe redirectToCheckout failed:', result.error);
        setMessage(`Payment Error: ${result.error.message}`);
        setTimeout(() => setMessage(''), 6000);
      } else {
        console.log('11. Stripe redirectToCheckout was called. If no error, user should be redirected.');
      }
    } catch (error) {
      console.error("Payment CRITICAL CATCH BLOCK Error:", error);
      setMessage(`Payment Process Error: ${error.message}`);
      setTimeout(() => setMessage(''), 6000);
    } finally {
      setIsActionLoading(false);
      if (message === "Initializing payment...") {
        setMessage("");
      }
      console.log('--- handlePayRent Finished ---');
    }
  };

  const handleRaiseRequest = async () => {
    if (!tenant || !property) { console.error("Cannot raise request: tenant or property data missing."); return; }
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot submit request.');
        console.error("REACT_APP_API_BASE_URL is not set");
        return;
    }
    const description = prompt("Describe the maintenance issue (e.g., Leaky Faucet in Kitchen):");
    if (!description || description.trim() === "") {
      setMessage("Maintenance description cannot be empty.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setIsActionLoading(true);
    const newRequest = {
      id: `temp-mr-${Date.now()}`,
      flatNo: tenant.flatNo, description: description.trim(),
      status: "Pending", date: new Date().toISOString().split("T")[0], remarks: "",
    };
    const originalProperty = JSON.parse(JSON.stringify(property));
    const optimisticProperty = {
        ...property,
        maintenanceRequests: [...(property.maintenanceRequests || []), newRequest]
    };
    setProperty(optimisticProperty);
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimisticProperty)
      });
      if (!res.ok) {
        setProperty(originalProperty);
        const errorData = await res.json().catch(() => ({message: "Failed to submit request."}));
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty);
      setMessage("Maintenance request submitted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setProperty(originalProperty);
      setMessage(`Error submitting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteRequest = async (requestIdToDelete) => {
    if (!property || !requestIdToDelete || !window.confirm("Are you sure you want to delete this maintenance request?")) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot delete request.');
        console.error("REACT_APP_API_BASE_URL is not set");
        return;
    }
    setIsActionLoading(true);
    const originalProperty = JSON.parse(JSON.stringify(property));
    const updatedMaintenanceRequests = (property.maintenanceRequests || []).filter(r => r.id !== requestIdToDelete);
    const optimisticProperty = { ...property, maintenanceRequests: updatedMaintenanceRequests };
    setProperty(optimisticProperty);
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(optimisticProperty)
      });
      if (!res.ok) {
        setProperty(originalProperty);
        const errorData = await res.json().catch(() => ({message: "Failed to delete request."}));
        throw new Error(errorData.message || "Failed to delete maintenance request.");
      }
      setMessage("Maintenance request deleted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Delete request error:", error);
      setProperty(originalProperty);
      setMessage(`Error deleting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- RENDER LOGIC ---
  console.log("TenantDashboard State before render:", { loading, isConfigError, tenant, property, message, configErrorMessage });

  if (loading) {
    return (
      <div className="tenant-dashboard-page-wrapper">
        <div className="loading-container tenant-animate-on-load is-visible">
          <span className="loading-spinner-large"></span>
          <p className="loading-text">Loading Your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isConfigError) {
     return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard tenant-animate-on-load is-visible">
                <h2 className="dashboard-title">Configuration Issue</h2>
                <p className="dashboard-message error">{configErrorMessage || "A configuration error occurred."}</p>
                 <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }
  
  if (!tenant || !property) { // This should ideally be caught by `message` having an error from fetch
     return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard tenant-animate-on-load is-visible">
                <h2 className="dashboard-title">Data Error</h2>
                <p className="dashboard-message error">{message || "Could not load tenant or property data. Please try again or contact support."}</p>
                 <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }

  // If all checks pass, render the dashboard
  const tenantMaintenanceRequests = (property.maintenanceRequests || []).filter(req => req.flatNo === tenant.flatNo).sort((a,b) => new Date(b.date) - new Date(a.date));
  const tenantPaymentHistory = (tenant.paymentHistory || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const ownerNotifications = (tenant.notifiedMessages || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  
  // Ensure canPayRent considers all necessary states, including isConfigError specifically for Stripe
  const isStripeConfigured = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
  const canPayRent = tenant.paymentStatus === "Pending" && 
                     tenant.rentAmount > 0 && 
                     API_BASE_URL && 
                     isStripeConfigured;

  return (
    <div className="tenant-dashboard-page-wrapper">
      <div className="tenant-dashboard-container tenant-animate-on-load" data-delay="0">
        <header className="tenant-dashboard-header tenant-animate-on-load" data-delay="50">
          <div className="logo">
            <svg width="36" height="30" viewBox="0 0 36 30" className="logo-icon" aria-hidden="true">
              <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#1e3a8a" />
              <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50" />
            </svg>
            <span className="brand-name-text">RentCare</span>
          </div>
          <h2 className="dashboard-title">My Dashboard</h2>
        </header>
        
        {message && ( // General messages (not config errors which have their own screen)
            <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'success'} tenant-animate-on-load`} data-delay="100">{message}</p>
        )}

        <section className="tenant-info-section tenant-animate-on-load" data-delay="150">
          <h3 className="section-title">Welcome, {tenant.name || 'Tenant'}!</h3>
          <div className="details-grid">
            <p><strong>Property:</strong> {property.name || 'N/A'}</p>
            <p><strong>Flat No:</strong> {tenant.flatNo || 'N/A'}</p>
            <p><strong>Rent:</strong> ₹{tenant.rentAmount || 0}</p>
            <p><strong>Status:</strong> <span className={`status-pill status-${(tenant.paymentStatus || 'pending').toLowerCase()}`}>{tenant.paymentStatus || 'Pending'}</span></p>
          </div>
          {tenant.paymentStatus === 'Paid' && tenant.lastNotify && <p className="last-paid-info">Last payment/update: {new Date(tenant.lastNotify).toLocaleDateString()}</p>}
        </section>

        <section className="tenant-actions-section tenant-animate-on-load" data-delay="200">
          {canPayRent && (
            <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isActionLoading}>
              {isActionLoading ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
            </button>
          )}
          {/* Show disabled Pay Rent button if it's pending but config is bad */}
          {!canPayRent && tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
             <button className="dashboard-button pay-rent-btn" disabled={true} title={!API_BASE_URL ? "API not configured" : !isStripeConfigured ? "Stripe not configured" : "Payment unavailable"}>
              Pay Rent (Unavailable)
            </button>
          )}
          <button 
            className="dashboard-button raise-request-btn" 
            onClick={handleRaiseRequest} 
            disabled={isActionLoading || !API_BASE_URL}
            title={!API_BASE_URL ? "API not configured" : ""}
          >
            {isActionLoading ? <span className="spinner"></span> : 'Raise Maintenance Request'}
          </button>
        </section>

        <div className="dashboard-columns-wrapper tenant-animate-on-load" data-delay="250">
          <section className="dashboard-column maintenance-column">
            <h4 className="column-title">My Maintenance Requests</h4>
            {tenantMaintenanceRequests.length > 0 ? (
              tenantMaintenanceRequests.map((req, index) => (
                <div key={req.id || `mr-${index}-${req.flatNo}`} className="info-card maintenance-card">
                  <p className="card-text"><strong>Issue:</strong> {req.description}</p>
                  <p className="card-text"><strong>Status:</strong> <span className={`status-pill status-${(req.status || 'pending').toLowerCase().replace(' ', '-')}`}>{req.status}</span></p>
                  <p className="card-date"><em>Submitted:</em> {req.date ? new Date(req.date).toLocaleDateString() : 'N/A'}</p>
                  {req.remarks && <p className="card-remarks"><em>Owner Remarks:</em> {req.remarks}</p>}
                  {req.status === "Pending" && (
                     <button 
                        className="dashboard-button delete-btn-small" 
                        onClick={() => handleDeleteRequest(req.id)} 
                        disabled={isActionLoading || !API_BASE_URL}
                        title={!API_BASE_URL ? "API not configured" : ""}
                    >
                        {isActionLoading ? <span className="spinner-small"></span> : 'Delete'}
                    </button>
                  )}
                </div>
              ))
            ) : <p className="no-items-text">No maintenance requests submitted.</p>}
          </section>

          <section className="dashboard-column payment-column">
            <h4 className="column-title">My Payment History</h4>
            {tenantPaymentHistory.length > 0 ? (
              <ul className="info-list">
                {tenantPaymentHistory.map((entry, index) => (
                  <li key={entry.id || `ph-${index}-${entry.date}`} className="info-card payment-card">
                    <div className="payment-details">
                      <span className="payment-amount">Amount: ₹{entry.amount || 0}</span>
                      <span className="payment-date">Date: {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}</span>
                      <span className={`payment-status status-pill status-${(entry.status || 'unknown').toLowerCase()}`}>{entry.status || 'Unknown'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-items-text">No payment history found.</p>
            )}
          </section>
        </div>

        <section className="notifications-section tenant-animate-on-load" data-delay="300">
          <h4 className="column-title">Notifications from Owner</h4>
          {ownerNotifications.length > 0 ? (
            <ul className="info-list">
              {ownerNotifications.map((msg, index) => (
                <li key={msg.id || `notif-${index}-${msg.date}`} className="info-card notification-card">
                  <p className="card-text">{msg.message}</p>
                  <span className="card-date">Received: {msg.date ? new Date(msg.date).toLocaleDateString() : 'N/A'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-items-text">No new notifications from the owner.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default TenantDashboard;
