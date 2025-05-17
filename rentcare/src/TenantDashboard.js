import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css";

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Ensure this is your Stripe Publishable Key
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""; // Default to empty string
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);


function TenantDashboard() {
  const { propertyId, flatNo } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfigError, setIsConfigError] = useState(false);

  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll('.tenant-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => {
          el.classList.add('is-visible');
        }, delay + index * 50);
      }
    });
  }, [loading, tenant]);


  useEffect(() => {
    setLoading(true);
    setMessage('');
    setIsConfigError(false); // Reset config error state

    if (!API_BASE_URL) {
      setMessage('Configuration Error: API URL is not set. Please contact support.');
      console.error("CRITICAL: REACT_APP_API_BASE_URL is not set in environment variables.");
      setLoading(false);
      setIsConfigError(true);
      return;
    }
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      setMessage('Configuration Error: Stripe is not configured correctly. Payment functionality will be disabled.');
      console.error("CRITICAL: REACT_APP_STRIPE_PUBLISHABLE_KEY is not set or is invalid in environment variables.");
      // Continue loading other data, but payment will be disabled by button logic
      setIsConfigError(true); // Indicate a config issue, but don't necessarily stop all loading
    }

    if (!propertyId || !flatNo) {
      setMessage("Error: Property ID or Flat No missing from URL. Cannot load dashboard.");
      setLoading(false);
      setIsConfigError(true); // Treat as a config/navigation error
      return;
    }

    fetch(`${API_BASE_URL}/properties/${propertyId}`)
      .then((res) => {
        if (!res.ok) {
          // Try to parse error from backend if available
          return res.json().then(errData => {
            throw new Error(errData.message || `Failed to fetch property data (Status: ${res.status})`);
          }).catch(() => { // Fallback if response isn't JSON
            throw new Error(`Failed to fetch property data (Status: ${res.status})`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!data) {
            throw new Error("Property data received is invalid or empty.");
        }
        setProperty(data);
        const matchedTenant = data.tenants?.find(t => t.flatNo === flatNo);

        if (!matchedTenant) {
          throw new Error(`Tenant for Flat No: ${flatNo} not found in property: ${data.name || propertyId}.`);
        }
        setTenant(matchedTenant);
      })
      .catch((error) => {
        console.error("Error loading tenant data:", error);
        setMessage(`Error loading dashboard: ${error.message}. Please try logging in again or contact support.`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyId, flatNo]);


  const handlePayRent = async () => {
    console.log('handlePayRent called');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('STRIPE_PUBLISHABLE_KEY provided:', !!STRIPE_PUBLISHABLE_KEY);
    console.log('Tenant data:', tenant);
    console.log('Property data:', property);

    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Payment cannot proceed.');
        console.error("REACT_APP_API_BASE_URL is not set");
        return;
    }
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Stripe is not configured correctly. Payment cannot proceed.');
        console.error("REACT_APP_STRIPE_PUBLISHABLE_KEY is not set or invalid.");
        return;
    }
    if (!tenant || !property || !tenant.rentAmount || tenant.rentAmount <= 0) {
      setMessage("Tenant data or rent amount is missing or invalid. Cannot proceed with payment.");
      console.error("Missing tenant, property, or valid rentAmount:", {tenant, property});
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    setIsActionLoading(true);
    setMessage("Initializing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe.js could not be loaded. Please check your internet connection or contact support if the issue persists.");
        setIsActionLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      console.log('Attempting to create Stripe session with body:', JSON.stringify({
        tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email || `${tenant.username || tenant.flatNo}@example.com` /* Fallback email if needed */ },
        propertyId: property.id,
        propertyName: property.name,
      }));

      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email || `${tenant.username || tenant.flatNo}@example.com` /* Provide a fallback if email is crucial */ },
          propertyId: property.id,
          propertyName: property.name,
        }),
      });

      console.log('Create session response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error from server."}) );
        console.error('Server error during create-checkout-session:', errorData);
        throw new Error(errorData.error || "Failed to create Stripe payment session. Please try again.");
      }
      const session = await response.json();

      if (!session || !session.id) {
        console.error('Invalid session received from backend:', session);
        throw new Error("Received an invalid session from the server. Cannot proceed with payment.");
      }

      console.log('Redirecting to Stripe Checkout with session ID:', session.id);
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        console.error('Stripe redirectToCheckout error:', result.error);
        setMessage(`Payment Error: ${result.error.message}`);
        setTimeout(() => setMessage(''), 6000);
      }
      // If redirectToCheckout is successful, the user is navigated away.
      // If it fails and returns here, an error occurred.
    } catch (error) {
      console.error("Payment Process Error:", error);
      setMessage(`Payment Error: ${error.message}`);
      setTimeout(() => setMessage(''), 6000);
    } finally {
      setIsActionLoading(false);
      // Only clear "Initializing payment..." if no other error message was set and not redirecting
      if (message === "Initializing payment...") {
        setMessage("");
      }
    }
  };


  const handleRaiseRequest = async () => {
    if (!tenant || !property) return;
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
    // Ensure new request has a unique ID if your backend doesn't assign one immediately upon array push
    // Or rely on backend to assign upon PUT. For optimistic UI, a temp ID is fine.
    const newRequest = {
      id: `temp-mr-${Date.now()}`, // Temporary ID for UI, backend should replace/confirm
      flatNo: tenant.flatNo, description: description.trim(),
      status: "Pending", date: new Date().toISOString().split("T")[0], remarks: "",
    };

    // Optimistically update UI first
    const optimisticProperty = {
        ...property,
        maintenanceRequests: [...(property.maintenanceRequests || []), newRequest]
    };
    setProperty(optimisticProperty); // Update property state to reflect new request immediately

    try {
      // Send only the new request or the minimal data needed for backend to add it.
      // Sending the whole property object can be heavy and prone to race conditions if other parts changed.
      // Ideal: POST to a dedicated /properties/:propertyId/maintenance-requests endpoint
      // Current approach: PUT the whole property object
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimisticProperty) // Send the optimistic state
      });
      if (!res.ok) {
        // Revert optimistic update on error
        setProperty(property); // Revert to original property state
        const errorData = await res.json().catch(() => ({message: "Failed to submit request."}));
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty); // Update with confirmed state from backend (which should include the new request with its final ID)

      setMessage("Maintenance request submitted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setProperty(property); // Revert optimistic update on error
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
    
    const originalProperty = { ...property }; // Keep a copy to revert on error
    const updatedMaintenanceRequests = (property.maintenanceRequests || []).filter(r => r.id !== requestIdToDelete);
    const optimisticProperty = { ...property, maintenanceRequests: updatedMaintenanceRequests };
    setProperty(optimisticProperty); // Optimistic UI update

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(optimisticProperty)
      });
      if (!res.ok) { 
        setProperty(originalProperty); // Revert
        const errorData = await res.json().catch(() => ({message: "Failed to delete request."}));
        throw new Error(errorData.message || "Failed to delete maintenance request.");
      }
      // Backend confirmed delete, property state is already optimistically updated.
      // Optionally, fetch the latest property state if backend might have made other changes:
      // const savedProperty = await res.json();
      // setProperty(savedProperty);
      setMessage("Maintenance request deleted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Delete request error:", error);
      setProperty(originalProperty); // Revert
      setMessage(`Error deleting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };


  if (isConfigError && loading) { // If config error happened during initial load phase
    // Allow loading to finish to display the config error message properly
  } else if (isConfigError) { // If config error persists after loading or set separately
     return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard tenant-animate-on-load is-visible">
                <h2 className="dashboard-title">Configuration Error</h2>
                <p className="dashboard-message error">{message}</p>
                 <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }


  if (loading) return (
    <div className="tenant-dashboard-page-wrapper">
      <div className="loading-container tenant-animate-on-load is-visible">
        <span className="loading-spinner-large"></span>
        <p className="loading-text">Loading Your Dashboard...</p>
      </div>
    </div>
  );

  if (!tenant || !property) return (
    <div className="tenant-dashboard-page-wrapper">
      <div className="error-container tenant-dashboard tenant-animate-on-load is-visible">
        <h2 className="dashboard-title">Access Error</h2>
        <p className="dashboard-message error">{message || "Could not load your information. Please ensure you are logged in correctly or contact support."}</p>
        <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
      </div>
    </div>
  );

  const tenantMaintenanceRequests = (property.maintenanceRequests || []).filter(req => req.flatNo === tenant.flatNo).sort((a,b) => new Date(b.date) - new Date(a.date));
  const tenantPaymentHistory = (tenant.paymentHistory || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const ownerNotifications = (tenant.notifiedMessages || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const canPayRent = tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_') && API_BASE_URL;

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
        {message && (
            <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'success'} tenant-animate-on-load`} data-delay="100">{message}</p>
        )}

        <section className="tenant-info-section tenant-animate-on-load" data-delay="150">
          <h3 className="section-title">Welcome, {tenant.name}!</h3>
          <div className="details-grid">
            <p><strong>Property:</strong> {property.name}</p>
            <p><strong>Flat No:</strong> {tenant.flatNo}</p>
            <p><strong>Rent:</strong> ₹{tenant.rentAmount}</p>
            <p><strong>Status:</strong> <span className={`status-pill status-${tenant.paymentStatus?.toLowerCase()}`}>{tenant.paymentStatus}</span></p>
          </div>
          {tenant.paymentStatus === 'Paid' && tenant.lastNotify && <p className="last-paid-info">Last payment/update: {new Date(tenant.lastNotify).toLocaleDateString()}</p>}
        </section>

        <section className="tenant-actions-section tenant-animate-on-load" data-delay="200">
          {canPayRent && (
            <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isActionLoading}>
              {isActionLoading ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
            </button>
          )}
          {!canPayRent && tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
             <button className="dashboard-button pay-rent-btn" disabled={true} title="Payment system is currently unavailable. Please check configuration.">
              Pay Rent (Unavailable)
            </button>
          )}
          <button className="dashboard-button raise-request-btn" onClick={handleRaiseRequest} disabled={isActionLoading || !API_BASE_URL}>
            {isActionLoading ? <span className="spinner"></span> : 'Raise Maintenance Request'}
          </button>
        </section>


        <div className="dashboard-columns-wrapper tenant-animate-on-load" data-delay="250">
          <section className="dashboard-column maintenance-column">
            <h4 className="column-title">My Maintenance Requests</h4>
            {tenantMaintenanceRequests.length > 0 ? (
              tenantMaintenanceRequests.map((req) => (
                <div key={req.id || `mr-${req.date}-${req.flatNo}`} className="info-card maintenance-card">
                  <p className="card-text"><strong>Issue:</strong> {req.description}</p>
                  <p className="card-text"><strong>Status:</strong> <span className={`status-pill status-${req.status?.toLowerCase().replace(' ', '-')}`}>{req.status}</span></p>
                  <p className="card-date"><em>Submitted:</em> {new Date(req.date).toLocaleDateString()}</p>
                  {req.remarks && <p className="card-remarks"><em>Owner Remarks:</em> {req.remarks}</p>}
                  {req.status === "Pending" && (
                     <button className="dashboard-button delete-btn-small" onClick={() => handleDeleteRequest(req.id)} disabled={isActionLoading || !API_BASE_URL}>
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
                {tenantPaymentHistory.map((entry) => (
                  <li key={entry.id || `ph-${entry.date}-${entry.amount}`} className="info-card payment-card">
                    <div className="payment-details">
                      <span className="payment-amount">Amount: ₹{entry.amount}</span>
                      <span className="payment-date">Date: {new Date(entry.date).toLocaleDateString()}</span>
                      <span className={`payment-status status-pill status-${entry.status?.toLowerCase()}`}>{entry.status}</span>
                    </div>
                    {/* Deleting payment history might be sensitive, commenting out
                    <button className="dashboard-button delete-btn-small" onClick={() => handleDeleteTransaction(entry.id)} disabled={isActionLoading || !API_BASE_URL}>
                        {isActionLoading ? <span className="spinner-small"></span> : 'Delete'}
                    </button> */}
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
              {ownerNotifications.map((msg) => (
                <li key={msg.id || `notif-${msg.date}`} className="info-card notification-card">
                  <p className="card-text">{msg.message}</p>
                  <span className="card-date">Received: {new Date(msg.date).toLocaleDateString()}</span>
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
