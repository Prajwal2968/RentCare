import React, { useEffect, useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css";

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
  // This console.warn will appear if the key is empty or doesn't start with pk_
  // The UI will also reflect this by disabling payment.
  console.warn("Stripe Publishable Key is missing, invalid, or not a 'pk_' key. StripePromise will be null.");
}
// --- END: Environment Variable Integration ---

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children, onSubmit, submitText = "Submit" , isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {onSubmit && (
          <div className="modal-footer">
            <button onClick={onClose} className="dashboard-button secondary" disabled={isLoading}>Cancel</button>
            <button onClick={onSubmit} className="dashboard-button primary" disabled={isLoading}>
              {isLoading ? <span className="spinner"></span> : submitText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


function TenantDashboard() {
  const params = useParams();
  const navigate = useNavigate();

  const propertyIdFromParams = params.propertyId;
  const flatNoFromParams = params.flatNo;

  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false); // General for non-payment/non-modal actions
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false); // For maintenance modal submission
  const [pageError, setPageError] = useState("");

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceDescription, setMaintenanceDescription] = useState("");

  useEffect(() => {
    console.log("TenantDashboard Mounted. PARAMS:", { propertyIdFromParams, flatNoFromParams });
    console.log("ENV VAR - API_BASE_URL:", API_BASE_URL);
    console.log("ENV VAR - STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

    let initialError = "";
    if (!API_BASE_URL) {
      initialError = "Application Error: API URL is not configured. Please contact support.";
      console.error("CRITICAL: REACT_APP_API_BASE_URL is not set.");
    } else if (!propertyIdFromParams || !flatNoFromParams) {
      initialError = "Application Error: Required information (Property ID or Flat No) is missing from the URL.";
      console.error("CRITICAL: Missing propertyId or flatNo from URL params.");
    }
    
    if (initialError) {
      setPageError(initialError);
      setLoading(false);
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      setMessage("Warning: Payment system is not fully configured. Pay Rent will be unavailable.");
      console.warn("Stripe key is not configured correctly or missing.");
    }

    const elementsToAnimate = document.querySelectorAll('.tenant-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => el.classList.add('is-visible'), delay + index * 50);
      }
    });
  }, [params, propertyIdFromParams, flatNoFromParams]); // Added params and its destructured versions


  useEffect(() => {
    if (pageError || !API_BASE_URL || !propertyIdFromParams || !flatNoFromParams) {
      if (!pageError) { // Set a generic error if somehow previous checks didn't catch it
        setPageError("Cannot fetch data due to missing configuration or parameters.");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');

    console.log(`Fetching property data for ID: ${propertyIdFromParams}`);
    fetch(`${API_BASE_URL}/properties/${propertyIdFromParams}`)
      .then(async (res) => {
        if (!res.ok) {
           const text = await res.text();
           try {
             const errData = JSON.parse(text);
             throw new Error(errData.message || `Server error (Status: ${res.status}) fetching property.`);
           } catch (e) {
             throw new Error(`Server error (Status: ${res.status}). Response: ${text.substring(0,100)}`);
           }
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
        console.error("Error loading tenant/property data:", error);
        setPageError(`Failed to load dashboard information: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyIdFromParams, flatNoFromParams, pageError]);


  const handlePayRent = async () => {
    console.log('--- handlePayRent Initiated ---'); /* ... console logs from previous ... */

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

    setIsPaymentProcessing(true); setMessage("Initializing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe.js failed to load. Check Stripe Key & network.");
        setIsPaymentProcessing(false); return;
      }
      const requestBody = {
        tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email || `${tenant.username || tenant.flatNo}-tenant@example.com` },
        propertyId: property.id, propertyName: property.name,
      };
      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const responseText = await response.text();
      if (!response.ok) {
        let errorData = { error: `Server Error: ${response.status}` };
        try {errorData = JSON.parse(responseText);} catch(e){ /* use default */}
        throw new Error(errorData.error || "Failed to create Stripe session.");
      }
      const session = JSON.parse(responseText);
      if (!session || !session.id) throw new Error("Invalid session from server.");
      const result = await stripe.redirectToCheckout({ sessionId: session.id });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      console.error("Payment Error:", error);
      setMessage(`Payment Error: ${error.message}`);
      setTimeout(() => setMessage(''), 6000);
    } finally {
      setIsPaymentProcessing(false);
      if (message === "Initializing payment...") setMessage("");
    }
  };

  const openMaintenanceModal = () => {
    setMaintenanceDescription("");
    setIsMaintenanceModalOpen(true);
  };

  const handleSubmitMaintenanceRequest = async () => {
    if (!tenant || !property) { console.error("Cannot raise request: tenant or property missing."); return; }
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot submit request.');
        console.error("RaiseRequest ABORTED: API_BASE_URL is not set.");
        return;
    }
    if (!maintenanceDescription || maintenanceDescription.trim() === "") {
      setMessage("Maintenance description cannot be empty.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setIsSubmittingRequest(true);
    const newRequest = {
      // The backend should ideally assign the 'id'.
      // If client generates, ensure it's unique enough or replaced by backend ID.
      id: `temp-mr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      flatNo: tenant.flatNo, description: maintenanceDescription.trim(),
      status: "Pending", date: new Date().toISOString().split("T")[0], remarks: "",
    };
    const originalProperty = JSON.parse(JSON.stringify(property)); // Deep copy
    const optimisticProperty = {
        ...property,
        maintenanceRequests: [...(property.maintenanceRequests || []), newRequest]
    };
    setProperty(optimisticProperty);

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimisticProperty) // Send the property with the new request added
      });
      if (!res.ok) {
        setProperty(originalProperty); // Revert
        const errorData = await res.json().catch(() => ({message: "Failed to parse server error."}));
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty); // Update with confirmed state from backend
      setMessage("Maintenance request submitted successfully.");
      setIsMaintenanceModalOpen(false);
      setMaintenanceDescription("");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setProperty(originalProperty); // Revert
      setMessage(`Error submitting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  
  const handleDeleteTransaction = async (transactionIdToDelete) => {
    if (!tenant || !property || !transactionIdToDelete ||
        !window.confirm("Are you sure you want to delete this payment record? This action might not be reversible.")) {
      return;
    }
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot delete transaction.'); return;
    }
    setIsActionLoading(true);
    const originalTenant = JSON.parse(JSON.stringify(tenant));
    const originalProperty = JSON.parse(JSON.stringify(property));

    const updatedPaymentHistory = (tenant.paymentHistory || []).filter(p => p.id !== transactionIdToDelete);
    const updatedTenantOptimistic = { ...tenant, paymentHistory: updatedPaymentHistory };
    const updatedTenantsArrayOptimistic = property.tenants.map(t =>
        t.flatNo === tenant.flatNo ? updatedTenantOptimistic : t
    );
    const updatedPropertyOptimistic = { ...property, tenants: updatedTenantsArrayOptimistic };

    setTenant(updatedTenantOptimistic);
    setProperty(updatedPropertyOptimistic);

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPropertyOptimistic)
      });
      if (!res.ok) {
        setTenant(originalTenant); setProperty(originalProperty);
        const errorData = await res.json().catch(() => ({ message: "Failed to parse server error." }));
        throw new Error(errorData.message || "Failed to delete payment record from server.");
      }
      setMessage("Payment record deleted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Delete transaction error:", error);
      setTenant(originalTenant); setProperty(originalProperty);
      setMessage(`Error deleting payment record: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteRequest = async (requestIdToDelete) => {
    if (!property || !requestIdToDelete || !window.confirm("Are you sure you want to delete this maintenance request?")) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured. Cannot delete request.'); return;
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
  if (loading) {
    return (
      <div className="page-feedback-container">
        <div className="loading-spinner-large"></div>
        <p className="loading-text">Loading Your Dashboard...</p>
      </div>
    );
  }

  if (pageError) {
     return (
        <div className="page-feedback-container error-message">
            <h2 className="dashboard-title">Application Error</h2>
            <p>{pageError}</p>
            <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
        </div>
    );
  }

  if (!tenant || !property) {
     return (
        <div className="page-feedback-container error-message">
            <h2 className="dashboard-title">Data Error</h2>
            <p>{message || "Could not load necessary information for your dashboard. Please ensure your login details are correct or try again."}</p>
            <p>Debug: Tenant Loaded: {String(!!tenant)}, Property Loaded: {String(!!property)}</p>
            <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
        </div>
    );
  }

  // If all checks pass, render the dashboard
  const tenantMaintenanceRequests = (property.maintenanceRequests || []).filter(req => req.flatNo === tenant.flatNo).sort((a,b) => new Date(b.date) - new Date(a.date));
  const tenantPaymentHistory = (tenant.paymentHistory || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const ownerNotifications = (tenant.notifiedMessages || []).sort((a,b) => new Date(b.date) - new Date(a.date));

  const isStripeReady = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
  const canPayRent = tenant.paymentStatus === "Pending" &&
                     tenant.rentAmount > 0 &&
                     API_BASE_URL &&
                     isStripeReady;

  return (
    <Fragment>
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

          {message && !pageError && ( // Only show general messages if no pageError
              <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('warning') ? 'error' : message.toLowerCase().includes('warning') ? 'warning' : 'success'}`}>{message}</p>
          )}

          <section className="tenant-info-section card-style">
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
              <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isPaymentProcessing}>
                {isPaymentProcessing ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
              </button>
            )}
            {!canPayRent && tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
               <button className="dashboard-button pay-rent-btn" disabled={true} title={!API_BASE_URL ? "API not configured" : !isStripeReady ? "Stripe/Payment not configured" : "Payment unavailable"}>
                Pay Rent (Unavailable)
              </button>
            )}
            <button
              className="dashboard-button raise-request-btn"
              onClick={openMaintenanceModal}
              disabled={isActionLoading || !API_BASE_URL}
              title={!API_BASE_URL ? "API not configured" : ""}
            >
              {isActionLoading && !isSubmittingRequest && !isPaymentProcessing ? <span className="spinner"></span> : 'Raise Maintenance Request'}
            </button>
          </section>

          <div className="dashboard-columns-wrapper">
              <section className="dashboard-column maintenance-column card-style">
                  <h4 className="column-title">My Maintenance Requests</h4>
                  <div className="scrollable-list">
                    {tenantMaintenanceRequests.length > 0 ? (
                        tenantMaintenanceRequests.map((req, index) => (
                        <div key={req.id || `mr-${index}-${req.flatNo}`} className="info-card maintenance-card">
                        <p className="card-text"><strong>Issue:</strong> {req.description}</p>
                        <p className="card-text"><strong>Status:</strong> <span className={`status-pill status-${(req.status || 'pending').toLowerCase().replace(' ', '-')}`}>{req.status || 'Pending'}</span></p>
                        <p className="card-date"><em>Submitted:</em> {req.date ? new Date(req.date).toLocaleDateString() : 'N/A'}</p>
                        {req.remarks && <p className="card-remarks"><em>Owner Remarks:</em> {req.remarks}</p>}
                        {req.status === "Pending" && ( // Only allow deleting PENDING requests by tenant
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
                  </div>
              </section>

              <section className="dashboard-column payment-column card-style">
                  <h4 className="column-title">My Payment History</h4>
                  <div className="scrollable-list">
                    {tenantPaymentHistory.length > 0 ? (
                    <ul className="info-list">
                        {tenantPaymentHistory.map((entry, index) => (
                        <li key={entry.id || `ph-${index}-${entry.date}`} className="info-card payment-card">
                            <div className="payment-details">
                                <span className="payment-amount">Amount: ₹{entry.amount || 0}</span>
                                <span className="payment-date">Date: {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}</span>
                                <span className={`payment-status status-pill status-${(entry.status || 'unknown').toLowerCase()}`}>{entry.status || 'Unknown'}</span>
                            </div>
                            {/* Delete button for transaction history */}
                            <button
                                className="dashboard-button delete-btn-small"
                                onClick={() => handleDeleteTransaction(entry.id)} // Assumes entry.id is unique
                                disabled={isActionLoading || !API_BASE_URL}
                                title={!API_BASE_URL ? "API not configured" : "Delete this payment record"}
                            >
                                {isActionLoading ? <span className="spinner-small"></span> : 'Delete'}
                            </button>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <p className="no-items-text">No payment history found.</p>
                    )}
                  </div>
              </section>
          </div>

          <section className="notifications-section card-style">
              <h4 className="column-title">Notifications from Owner</h4>
              <div className="scrollable-list">
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
              </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        title="Raise a New Maintenance Request"
        onSubmit={handleSubmitMaintenanceRequest}
        submitText="Submit Request"
        isLoading={isSubmittingRequest}
      >
        <textarea
          className="modal-textarea"
          placeholder="Please describe the issue in detail..."
          value={maintenanceDescription}
          onChange={(e) => setMaintenanceDescription(e.target.value)}
          rows="5"
        />
      </Modal>
    </Fragment>
  );
}

export default TenantDashboard;
