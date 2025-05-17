import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css";

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Ensure this is your Stripe Publishable Key (should also be an env variable ideally)
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_51R1suwP2pQ6bNloojbUe76BeunvWqgOXuukkLMm3A5yIVkD5WWp3A1De4Nyi0xqM6LZ7VtDNuGFW42ZFQCcN8fvR00GP5zpLta";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);


function TenantDashboard() {
  const { propertyId, flatNo } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

    if (!API_BASE_URL) {
      setMessage('API URL is not configured. Cannot fetch data.');
      console.error("REACT_APP_API_BASE_URL is not set");
      setLoading(false);
      return;
    }
    if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Stripe Publishable Key is not configured correctly.');
        console.error("REACT_APP_STRIPE_PUBLISHABLE_KEY is not set or invalid.");
        setLoading(false); // Potentially stop loading if payment is a core feature and Stripe isn't set up
    }


    if (!propertyId || !flatNo) {
      setMessage("Error: Property ID or Flat No missing from URL.");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/properties/${propertyId}`) // MODIFIED URL
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch property data (Status: ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setProperty(data);
        const matchedTenant = data.tenants?.find(t => t.flatNo === flatNo);

        if (!matchedTenant) {
          throw new Error("Tenant not found in this property.");
        }
        setTenant(matchedTenant);
      })
      .catch((error) => {
        console.error("Error loading tenant data:", error);
        setMessage(`Error: ${error.message}. Please try logging in again or contact support.`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyId, flatNo]);


  const handlePayRent = async () => {
    if (!tenant || !property || !tenant.rentAmount) {
      setMessage("Tenant data or rent amount is missing. Cannot proceed with payment.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }
    setIsActionLoading(true);
    setMessage("Processing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe.js has not loaded yet. Please try again in a moment.");
        setIsActionLoading(false);
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, { // MODIFIED URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: { flatNo: tenant.flatNo, rentAmount: tenant.rentAmount, name: tenant.name, email: tenant.email /* Add email if available */ },
          propertyId: property.id,
          propertyName: property.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create Stripe session.");
      }
      const session = await response.json();
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) {
        setMessage(`Stripe Error: ${result.error.message}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error("Payment Error:", error);
      setMessage(`Error during payment: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };


  const handleRaiseRequest = async () => {
    if (!tenant || !property) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }

    const description = prompt("Describe the maintenance issue (e.g., Leaky Faucet in Kitchen):");
    if (!description || description.trim() === "") {
      setMessage("Maintenance description cannot be empty.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setIsActionLoading(true);
    const newRequest = {
      // Backend should assign a unique ID for the request
      id: `mr-${Date.now()}`, // Temporary client-side ID if needed for UI before backend confirmation
      flatNo: tenant.flatNo, description: description.trim(),
      status: "Pending", date: new Date().toISOString().split("T")[0], remarks: "",
    };

    const updatedMaintenanceRequests = [...(property.maintenanceRequests || []), newRequest];
    const updatedProperty = { ...property, maintenanceRequests: updatedMaintenanceRequests };

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, { // MODIFIED URL
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProperty)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty);
      // const updatedTenant = savedProperty.tenants?.find(t => t.flatNo === flatNo);
      // if(updatedTenant) setTenant(updatedTenant); // Tenant data itself doesn't change here

      setMessage("Maintenance request submitted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setMessage(`Error submitting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionIdToDelete) => {
    if (!tenant || !property || !transactionIdToDelete || !window.confirm("Are you sure you want to delete this payment entry?")) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }
    setIsActionLoading(true);
    const updatedPaymentHistory = (tenant.paymentHistory || []).filter(p => p.id !== transactionIdToDelete);
    const updatedTenantData = { ...tenant, paymentHistory: updatedPaymentHistory };
    const updatedTenantsArray = property.tenants.map(t => t.flatNo === tenant.flatNo ? updatedTenantData : t);
    const updatedProperty = { ...property, tenants: updatedTenantsArray };

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, { // MODIFIED URL
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedProperty)
      });
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || "Failed to delete transaction."); }
      const savedProperty = await res.json();
      setProperty(savedProperty);
      const currentTenant = savedProperty.tenants?.find(t => t.flatNo === flatNo);
      if (currentTenant) setTenant(currentTenant);
      setMessage("Transaction deleted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Delete transaction error:", error); setMessage(`Error deleting transaction: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally { setIsActionLoading(false); }
  };

  const handleDeleteRequest = async (requestIdToDelete) => {
    if (!property || !requestIdToDelete || !window.confirm("Are you sure you want to delete this maintenance request?")) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }
    setIsActionLoading(true);
    const updatedMaintenanceRequests = (property.maintenanceRequests || []).filter(r => r.id !== requestIdToDelete);
    const updatedProperty = { ...property, maintenanceRequests: updatedMaintenanceRequests };

    try {
      const res = await fetch(`${API_BASE_URL}/properties/${property.id}`, { // MODIFIED URL
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedProperty)
      });
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || "Failed to delete maintenance request."); }
      const savedProperty = await res.json();
      setProperty(savedProperty); // This will re-render and filter maintenance requests for the UI
      setMessage("Maintenance request deleted successfully.");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Delete request error:", error); setMessage(`Error deleting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally { setIsActionLoading(false); }
  };


  if (!API_BASE_URL && message.includes('API URL is not configured')) {
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
  if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_') && message.includes('Stripe Publishable Key')) {
    return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard tenant-animate-on-load is-visible">
                <h2 className="dashboard-title">Payment Configuration Error</h2>
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
        {message && !message.includes('API URL is not configured') && !message.includes('Stripe Publishable Key') && (
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
          {tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
            <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isActionLoading || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')}>
              {isActionLoading ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
            </button>
          )}
          <button className="dashboard-button raise-request-btn" onClick={handleRaiseRequest} disabled={isActionLoading}>
            {isActionLoading ? <span className="spinner"></span> : 'Raise Maintenance Request'}
          </button>
        </section>


        <div className="dashboard-columns-wrapper tenant-animate-on-load" data-delay="250">
          <section className="dashboard-column maintenance-column">
            <h4 className="column-title">My Maintenance Requests</h4>
            {tenantMaintenanceRequests.length > 0 ? (
              tenantMaintenanceRequests.map((req) => (
                <div key={req.id || `mr-${req.date}-${req.flatNo}`} className="info-card maintenance-card"> {/* Ensure unique key */}
                  <p className="card-text"><strong>Issue:</strong> {req.description}</p>
                  <p className="card-text"><strong>Status:</strong> <span className={`status-pill status-${req.status?.toLowerCase().replace(' ', '-')}`}>{req.status}</span></p>
                  <p className="card-date"><em>Submitted:</em> {new Date(req.date).toLocaleDateString()}</p>
                  {req.remarks && <p className="card-remarks"><em>Owner Remarks:</em> {req.remarks}</p>}
                  {req.status === "Pending" && ( // Allow delete only if pending
                     <button className="dashboard-button delete-btn-small" onClick={() => handleDeleteRequest(req.id)} disabled={isActionLoading}>
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
                  <li key={entry.id || `ph-${entry.date}-${entry.amount}`} className="info-card payment-card"> {/* Ensure unique key */}
                    <div className="payment-details">
                      <span className="payment-amount">Amount: ₹{entry.amount}</span>
                      <span className="payment-date">Date: {new Date(entry.date).toLocaleDateString()}</span>
                      <span className={`payment-status status-pill status-${entry.status?.toLowerCase()}`}>{entry.status}</span>
                    </div>
                    {/* Deleting payment history might be sensitive, consider if needed */}
                    {/* <button className="dashboard-button delete-btn-small" onClick={() => handleDeleteTransaction(entry.id)} disabled={isActionLoading}>
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
                <li key={msg.id || `notif-${msg.date}`} className="info-card notification-card"> {/* Ensure unique key */}
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
