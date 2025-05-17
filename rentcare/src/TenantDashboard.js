import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import "./TenantDashboard.css";

// It's crucial these are correctly picked up by your build system
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

let stripePromise = null;
try {
  if (STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  } else {
    console.warn("Stripe Publishable Key is missing or invalid. StripePromise will be null.");
    stripePromise = Promise.resolve(null); // Ensure it's a promise that resolves to null
  }
} catch (error) {
  console.error("Error initializing Stripe Promise:", error);
  stripePromise = Promise.resolve(null); // Fallback
}


function TenantDashboard() {
  const params = useParams();
  const navigate = useNavigate();

  const [propertyId, setPropertyId] = useState(null);
  const [flatNo, setFlatNo] = useState(null);

  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pageError, setPageError] = useState(""); // More specific error state for fatal errors

  useEffect(() => {
    console.log("TenantDashboard Mounted.");
    console.log("Raw useParams:", params); // Log raw params
    
    const pId = params.propertyId;
    const fNo = params.flatNo;

    setPropertyId(pId);
    setFlatNo(fNo);

    console.log("Resolved propertyId:", pId, "Resolved flatNo:", fNo);
    console.log("ENV VAR - API_BASE_URL:", API_BASE_URL);
    console.log("ENV VAR - STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

    if (!API_BASE_URL) {
      console.error("FATAL: REACT_APP_API_BASE_URL is not defined!");
      setPageError("Application is not configured correctly (API_URL). Please contact support.");
      setLoading(false);
      return;
    }
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      console.warn("Stripe key is not configured. Payment will be disabled.");
      // Not necessarily fatal for the whole page, but payment won't work.
      // Set a non-fatal message or let canPayRent handle it.
      setMessage("Warning: Payment system not fully configured.");
    }

    if (!pId || !fNo) {
      console.error("FATAL: propertyId or flatNo is missing from URL parameters.");
      setPageError("Invalid page address. Required information is missing.");
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
  }, [params]); // Depend on params object


  useEffect(() => {
    // This effect now only runs if pre-checks in the mount effect pass
    if (pageError || !API_BASE_URL || !propertyId || !flatNo) {
      if (!pageError) { // If pageError wasn't set by mount effect but conditions still fail
          setPageError("Initial setup failed. Cannot fetch data.");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');

    console.log(`Fetching data for propertyId: ${propertyId}`);
    fetch(`${API_BASE_URL}/properties/${propertyId}`)
      .then((res) => {
        if (!res.ok) {
          return res.text().then(text => { // Get text to see if it's JSON or HTML error
            try {
              const errData = JSON.parse(text);
              throw new Error(errData.message || `Server error (Status: ${res.status})`);
            } catch (e) {
              throw new Error(`Server error (Status: ${res.status}). Response: ${text.substring(0,100)}`);
            }
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data !== 'object') {
            throw new Error("Property data from server is invalid.");
        }
        console.log("Fetched Property Data:", data);
        setProperty(data);
        const matchedTenant = data.tenants?.find(t => t.flatNo === flatNo);

        if (!matchedTenant) {
          throw new Error(`Tenant for Flat No: "${flatNo}" not found in property: "${data.name || propertyId}".`);
        }
        console.log("Matched Tenant:", matchedTenant);
        setTenant(matchedTenant);
      })
      .catch((error) => {
        console.error("Error loading dashboard data:", error);
        setPageError(`Failed to load dashboard: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyId, flatNo, pageError]); // Re-run if IDs change or pageError clears (though unlikely)


  const handlePayRent = async () => {
    console.log('--- handlePayRent Initiated ---');
    // ... (keep the detailed logging from previous version)

    if (!API_BASE_URL || !STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Configuration error prevents payment.');
        console.error("PayRent ABORTED: Critical config missing."); return;
    }
    if (!tenant || !property || !tenant.rentAmount || tenant.rentAmount <= 0) {
      setMessage("Tenant/Property data or rent amount invalid.");
      console.error("PayRent ABORTED: Invalid data.", {tenant, property}); return;
    }

    setIsActionLoading(true);
    setMessage("Initializing payment...");
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setMessage("Stripe.js failed to load. Check Stripe Key & network.");
        console.error("PayRent ABORTED: Stripe object is null.");
        setIsActionLoading(false); return;
      }
      console.log('Stripe.js loaded.');

      const requestBody = { /* ... */ }; // Same as before
      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, { /* ... */ }); // Same as before
      
      console.log('Backend response status:', response.status);
      const responseText = await response.text();
      if (!response.ok) { /* ... error handling ... */ throw new Error(/* ... */); }
      const session = JSON.parse(responseText);
      console.log('Session from backend:', session);

      if (!session || !session.id) { /* ... error handling ... */ throw new Error(/* ... */); }
      
      console.log('Redirecting to Stripe:', session.id);
      const result = await stripe.redirectToCheckout({ sessionId: session.id });
      if (result.error) { /* ... error handling ... */ }

    } catch (error) { /* ... error handling ... */ }
    finally { setIsActionLoading(false); /* ... */ }
  };

  const handleRaiseRequest = async () => { /* ... Same as previous ... */ };
  const handleDeleteRequest = async (requestIdToDelete) => { /* ... Same as previous ... */ };


  // --- RENDER LOGIC ---
  console.log("TenantDashboard PRE-RENDER State:", { loading, pageError, tenant, property });

  if (loading) {
    return (
      <div className="tenant-dashboard-page-wrapper">
        <div className="loading-container is-visible"> {/* Ensure is-visible is always on for loading */}
          <span className="loading-spinner-large"></span>
          <p className="loading-text">Loading Dashboard...</p>
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
  
  // If we reach here, basic data should be loaded. We still need to check for tenant and property for the main UI.
  if (!tenant || !property) {
     return (
        <div className="tenant-dashboard-page-wrapper">
            <div className="error-container tenant-dashboard is-visible">
                <h2 className="dashboard-title">Data Incomplete</h2>
                <p className="dashboard-message error">Essential tenant or property information could not be loaded. Please try again or contact support.</p>
                <p>Debug Info: Tenant Loaded: {String(!!tenant)}, Property Loaded: {String(!!property)}</p>
                 <button onClick={() => navigate('/login')} className="dashboard-button primary">Go to Login</button>
            </div>
        </div>
    );
  }

  // Main dashboard content
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
      <div className="tenant-dashboard-container tenant-animate-on-load is-visible"> {/* Assume is-visible if rendered */}
        <header className="tenant-dashboard-header">
          {/* ... Header JSX ... */}
        </header>
        
        {message && (
            <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'success'}`}>{message}</p>
        )}

        <section className="tenant-info-section">
          <h3 className="section-title">Welcome, {tenant.name || 'Tenant'}!</h3>
          {/* ... Tenant Info JSX ... */}
        </section>

        <section className="tenant-actions-section">
          {canPayRent && (
            <button className="dashboard-button pay-rent-btn" onClick={handlePayRent} disabled={isActionLoading}>
              {isActionLoading ? <span className="spinner"></span> : `Pay Rent (₹${tenant.rentAmount})`}
            </button>
          )}
          {!canPayRent && tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && (
             <button className="dashboard-button pay-rent-btn" disabled={true} title={!API_BASE_URL ? "API not configured" : !isStripeReady ? "Stripe not configured" : "Payment unavailable"}>
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

        {/* ... Maintenance, Payment History, Notifications Sections JSX ... */}
        
      </div>
    </div>
  );
}

export default TenantDashboard;
