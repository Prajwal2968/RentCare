import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css"; // Link to new CSS file

// --- START: Environment Variable Integration ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

let stripePromise = null;
if (STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
  try {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  } catch (error) {
    console.error("Error initializing Stripe with loadStripe:", error);
    // stripePromise remains null, will be caught by handlePayRent
  }
} else {
  console.warn("Stripe Publishable Key is missing, invalid, or not a 'pk_' key. StripePromise will be null.");
  // stripePromise remains null
}
// --- END: Environment Variable Integration ---

function TenantDashboard() {
  const params = useParams(); // Get the whole params object
  const navigate = useNavigate();

  // It's better to get propertyId and flatNo from params inside useEffect
  // or ensure they are stable if used in dependency arrays.
  // For now, we'll get them once and handle if they are missing.
  const propertyIdFromParams = params.propertyId;
  const flatNoFromParams = params.flatNo;


  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pageError, setPageError] = useState(""); // For fatal page errors

  useEffect(() => {
    // Initial console logs for debugging environment and params
    console.log("TenantDashboard Mounted.");
    console.log("Raw useParams:", params);
    console.log("Resolved propertyId:", propertyIdFromParams);
    console.log("Resolved flatNo:", flatNoFromParams);
    console.log("ENV VAR - API_BASE_URL:", API_BASE_URL);
    console.log("ENV VAR - STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

    // Initial configuration checks
    if (!API_BASE_URL) {
      setPageError("Application Error: API URL is not configured. Please contact support.");
      setLoading(false);
      return;
    }
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      // This is a warning, page might still load but payment will be disabled.
      setMessage("Warning: Payment system is not fully configured. Pay Rent will be unavailable.");
      console.warn("Stripe key is not configured correctly.");
    }
    if (!propertyIdFromParams || !flatNoFromParams) {
      setPageError("Application Error: Required information (Property ID or Flat No) is missing from the URL.");
      setLoading(false);
      return;
    }

    // Animation logic
    const elementsToAnimate = document.querySelectorAll('.tenant-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => el.classList.add('is-visible'), delay + index * 50);
      }
    });
  }, [params]); // Rerun if params change (though they usually don't for a given route instance)


  useEffect(() => {
    // Data fetching effect
    if (pageError || !API_BASE_URL || !propertyIdFromParams || !flatNoFromParams) {
      // If there's already a page error or essential configs/params are missing, don't fetch.
      // The loading state might have been set to false by the previous effect.
      if (!pageError && (!API_BASE_URL || !propertyIdFromParams || !flatNoFromParams) ) {
        setPageError("Cannot fetch data due to missing configuration or parameters.");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(''); // Clear previous operational messages

    console.log(`Fetching property data for ID: ${propertyIdFromParams}`);
    fetch(`${API_BASE_URL}/properties/${propertyIdFromParams}`)
      .then((res) => {
        if (!res.ok) {
           return res.text().then(text => {
            try {
              const errData = JSON.parse(text);
              throw new Error(errData.message || `Server error (Status: ${res.status}) while fetching property.`);
            } catch (e) {
              throw new Error(`Server error (Status: ${res.status}). Response: ${text.substring(0,100)}`);
            }
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data !== 'object') {
            throw new Error("Invalid property data received from server.");
        }
        console.log("Fetched Property Data:", data);
        setProperty(data);
        const matchedTenant = data.tenants?.find(t => t.flatNo === flatNoFromParams);

        if (!matchedTenant) {
          throw new Error(`Tenant for Flat No: "${flatNoFromParams}" not found in property: "${data.name || propertyIdFromParams}".`);
        }
        console.log("Matched Tenant:", matchedTenant);
        setTenant(matchedTenant);
      })
      .catch((error) => {
        console.error("Error loading tenant data:", error);
        // Set pageError for critical data load failures
        setPageError(`Failed to load dashboard information: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyIdFromParams, flatNoFromParams, pageError]); // Depend on resolved params and pageError state


  const handlePayRent = async () => {
    console.log('--- handlePayRent Initiated ---');
    console.log('Tenant:', tenant, 'Property:', property, 'Rent:', tenant?.rentAmount);

    if (!API_BASE_URL || !STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Payment system is not configured correctly. Please contact support.');
        console.error("PayRent ABORTED: Critical configuration (API_URL or Stripe Key) missing.");
        return;
    }
    if (!tenant || !property || !tenant.rentAmount || tenant.rentAmount <= 0) {
        setMessage("Tenant data or rent amount is missing or invalid. Cannot proceed.");
        console.error("PayRent ABORTED: Invalid tenant/property data or rent amount.");
        setTimeout(() => setMessage(''), 4000);
        return;
    }

    setIsActionLoading(true);
    setMessage("Initializing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe payment system could not be loaded. This may be due to an invalid configuration or network issue. Please try again or contact support.");
        console.error("PayRent ABORTED: Stripe.js (stripe object) is null.");
        setIsActionLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      console.log('Stripe.js loaded successfully for payment.');

      const requestBody = {
        tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email || `${tenant.username || tenant.flatNo}-tenant@example.com` },
        propertyId: property.id, // Ensure property.id exists
        propertyName: property.name,
      };
      console.log('Attempting to create Stripe session with body:', JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('Create session backend response status:', response.status);
      const responseText = await response.text();
      if (!response.ok) {
        let errorData = { error: `Server error (Status: ${response.status}). Could not create payment session. Response: ${responseText.substring(0,150)}` };
        try { errorData = JSON.parse(responseText); } catch (e) { /* keep default */ }
        console.error('PayRent ERROR: Server error during create-checkout-session:', errorData);
        throw new Error(errorData.error || `Failed to create Stripe payment session (Status: ${response.status}).`);
      }
      const session = JSON.parse(responseText);
      console.log('Session object received from backend:', session);

      if (!session || !session.id) {
        console.error('PayRent ERROR: Invalid session object or session.id missing from backend:', session);
        throw new Error("Received an invalid session from the server.");
      }

      console.log('Redirecting to Stripe Checkout with session ID:', session.id);
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        console.error('PayRent ERROR: Stripe redirectToCheckout failed:', result.error);
        setMessage(`Payment Error: ${result.error.message}`);
        setTimeout(() => setMessage(''), 6000);
      } else {
        console.log('Stripe redirectToCheckout initiated. User should be redirected.');
      }
    } catch (error) {
      console.error("PayRent CRITICAL CATCH BLOCK Error:", error);
      setMessage(`Payment Process Error: ${error.message}`);
      setTimeout(() => setMessage(''), 6000);
    } finally {
      setIsActionLoading(false);
      if (message === "Initializing payment...") { setMessage(""); }
      console.log('--- handlePayRent Finished ---');
    }
  };

  const handleRaiseRequest = async () => {
    if (!tenant || !property) { console.error("Cannot raise request: tenant or property missing."); return; }
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot submit request.');
        console.error("RaiseRequest ABORTED: API_BASE_URL is not set.");
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
      id: `temp-mr-${Date.now()}`, // Temporary client-side ID
      flatNo: tenant.flatNo, description: description.trim(),
      status: "Pending", date: new Date().toISOString().split("T")[0], remarks: "",
    };
    const originalProperty = JSON.parse(JSON.stringify(property)); // Deep copy for potential revert
    const optimisticProperty = {
        ...property,
        maintenanceRequests: [...(property.maintenanceRequests || []), newRequest]
    };
    setProperty(optimisticProperty); // Optimistic UI update

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimisticProperty)
      });
      if (!res.ok) {
        setProperty(originalProperty); // Revert optimistic update
        const errorData = await res.json().catch(() => ({message: "Failed to parse server error."}));
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty); // Update with confirmed state from backend
      setMessage("Maintenance request submitted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setProperty(originalProperty); // Ensure revert on catch
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
        console.error("DeleteRequest ABORTED: API_BASE_URL is not set.");
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
        const errorData = await res.json().catch(() => ({message: "Failed to parse server error."}));
        throw new Error(errorData.message || "Failed to delete maintenance request.");
      }
      // No need to setProperty again if optimistic update is the final state
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
  console.log("TenantDashboard PRE-RENDER State:", { loading, pageError, tenant: !!tenant, property: !!property, message });


  if (loading) {
    return (
      <div className="tenant-dashboard-page-wrapper">
        <div className="loading-container is-visible">
          <span className="loading-spinner-large"></span>
          <p className="loading-text">Loading Your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (pageError) {
     return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard is-visible">
                <h2 className="dashboard-title">Application Error</h2>
                <p className="dashboard-message error">{pageError}</p>
                <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }

  if (!tenant || !property) {
     return ( // This screen appears if data fetching failed but didn't set pageError (e.g. specific tenant not found)
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard is-visible">
                <h2 className="dashboard-title">Data Error</h2>
                <p className="dashboard-message error">{message || "Could not load necessary information for your dashboard. Please ensure your login details are correct or try again."}</p>
                <p>Debug: Tenant Found: {String(!!tenant)}, Property Found: {String(!!property)}</p>
                <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }

  // If all checks pass, render the main dashboard
  const tenantMaintenanceRequests = (property.maintenanceRequests || []).filter(req => req.flatNo === tenant.flatNo).sort((a,b) => new Date(b.date) - new Date(a.date));
  const tenantPaymentHistory = (tenant.paymentHistory || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const ownerNotifications = (tenant.notifiedMessages || []).sort((a,b) => new Date(b.date) - new Date(a.date));

  const isStripeReady = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
  const canPayRent = tenant.paymentStatus === "Pending" &&
                     tenant.rentAmount > 0 &&
                     API_BASE_URL &&
                     isStripeReady;

  return (
    <div className="tenant-dashboard-page-wrapper">
      <div className="tenant-dashboard-container tenant-animate-on-load is-visible">
        <header className="tenant-dashboard-header">
          <div className="logo">
            <svg width="36" height="30" viewBox="0 0 36 30" className="logo-icon" aria-hidden="true">
              <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#1e3a8a"/>
              <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50"/>
            </svg>
            <span className="brand-name-text">RentCare</span>
          </div>
          <h2 className="dashboard-title">My Dashboard</h2>
        </header>

        {message && (
            <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'success'}`}>{message}</p>
        )}

        <section className="tenant-info-section">
          <h3 className="section-title">Welcome, {tenant.name || 'Tenant'}!</h3>
          <div className="details-grid">
            <p><strong>Property:</strong> {property.name || 'N/A'}</p>
            <p><strong>Flat No:</strong> {tenant.flatNo || 'N/A'}</p>
            <p><strong>Rent:</strong> ₹{tenant.rentAmount || 0}</p>
            <p><strong>Status:</strong> <span className={`status-pill status-${(tenant.paymentStatus || 'pending').toLowerCase()}`}>{tenant.paymentStatus || 'Pending'}</span></p>
          </div>
          {tenant.paymentStatus === 'Paid' && tenant.lastNotify && <p className="last-paid-info">Last payment/update: {new Date(tenant.lastNotify).toLocaleDateString()}</p>}
        </section>

        <section className="tenant-actions-section">
          {canPayRent && (
            <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isActionLoading}>
              {isActionLoading ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
            </button>
          )}
          {!canPayRent && tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
             <button className="dashboard-button pay-rent-btn" disabled={true} title={!API_BASE_URL ? "API not configured" : !isStripeReady ? "Stripe/Payment not configured" : "Payment unavailable"}>
              Pay Rent (Unavailable)
            </button>
          )}
          <button
            className="dashboard-button raise-request-btn"
            onClick={handleRaiseRequest}
            disabled={isActionLoading || !API_BASE_URL} // Disable if API not set
            title={!API_BASE_URL ? "API not configured" : ""}
          >
            {isActionLoading ? <span className="spinner"></span> : 'Raise Maintenance Request'}
          </button>
        </section>

        <div className="dashboard-columns-wrapper">
            <section className="dashboard-column maintenance-column">
                <h4 className="column-title">My Maintenance Requests</h4>
                {tenantMaintenanceRequests.length > 0 ? (
                    tenantMaintenanceRequests.map((req, index) => (
                    <div key={req.id || `mr-${index}-${req.flatNo}`} className="info-card maintenance-card">
                    <p className="card-text"><strong>Issue:</strong> {req.description}</p>
                    <p className="card-text"><strong>Status:</strong> <span className={`status-pill status-${(req.status || 'pending').toLowerCase().replace(' ', '-')}`}>{req.status || 'Pending'}</span></p>
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

        <section className="notifications-section">
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
