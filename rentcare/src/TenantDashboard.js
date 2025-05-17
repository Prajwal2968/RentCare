import React, { useEffect, useState, Fragment } from "react"; // Added Fragment
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
  }
} else {
  console.warn("Stripe Publishable Key is missing, invalid, or not a 'pk_' key. StripePromise will be null.");
}
// --- END: Environment Variable Integration ---

// Simple Modal Component (can be moved to its own file)
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
  const [isActionLoading, setIsActionLoading] = useState(false); // General action spinner
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false); // Specific for payment
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false); // Specific for maintenance
  const [pageError, setPageError] = useState("");

  // --- New states for Maintenance Request Modal ---
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  // --- End New states ---


  useEffect(() => {
    console.log("TenantDashboard Mounted.");
    console.log("Raw useParams:", params);
    console.log("Resolved propertyId:", propertyIdFromParams);
    console.log("Resolved flatNo:", flatNoFromParams);
    console.log("ENV VAR - API_BASE_URL:", API_BASE_URL);
    console.log("ENV VAR - STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

    if (!API_BASE_URL) {
      setPageError("Application Error: API URL is not configured. Please contact support.");
      setLoading(false); return;
    }
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      setMessage("Warning: Payment system is not fully configured. Pay Rent will be unavailable.");
      console.warn("Stripe key is not configured correctly.");
    }
    if (!propertyIdFromParams || !flatNoFromParams) {
      setPageError("Application Error: Required information (Property ID or Flat No) is missing.");
      setLoading(false); return;
    }

    const elementsToAnimate = document.querySelectorAll('.tenant-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => el.classList.add('is-visible'), delay + index * 50);
      }
    });
  }, [params]);


  useEffect(() => {
    if (pageError || !API_BASE_URL || !propertyIdFromParams || !flatNoFromParams) {
      if (!pageError && (!API_BASE_URL || !propertyIdFromParams || !flatNoFromParams) ) {
        setPageError("Cannot fetch data due to missing configuration or parameters.");
      }
      setLoading(false); return;
    }
    setLoading(true); setMessage('');
    fetch(`${API_BASE_URL}/properties/${propertyIdFromParams}`)
      .then(async (res) => { // make async to await text()
        if (!res.ok) {
           const text = await res.text(); // Await text to ensure it's read
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
            throw new Error("Invalid property data received.");
        }
        setProperty(data);
        const matchedTenant = data.tenants?.find(t => t.flatNo === flatNoFromParams);
        if (!matchedTenant) {
          throw new Error(`Tenant for Flat No: "${flatNoFromParams}" not found in property.`);
        }
        setTenant(matchedTenant);
      })
      .catch((error) => {
        console.error("Error loading tenant data:", error);
        setPageError(`Failed to load dashboard information: ${error.message}`);
      })
      .finally(() => setLoading(false));
  }, [propertyIdFromParams, flatNoFromParams, pageError]);


  const handlePayRent = async () => {
    if (!API_BASE_URL || !STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        setMessage('Payment system not configured.'); return;
    }
    if (!tenant || !property || !tenant.rentAmount || tenant.rentAmount <= 0) {
      setMessage("Tenant/Property data or rent amount invalid."); return;
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
    setMaintenanceDescription(""); // Reset description
    setIsMaintenanceModalOpen(true);
  };

  const handleSubmitMaintenanceRequest = async () => {
    if (!tenant || !property) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); return;
    }
    if (!maintenanceDescription || maintenanceDescription.trim() === "") {
      setMessage("Maintenance description cannot be empty.");
      setTimeout(() => setMessage(''), 3000);
      return; // Don't close modal if description is empty
    }
    setIsSubmittingRequest(true); // Use specific loader
    const newRequest = {
      id: `temp-mr-${Date.now()}`, flatNo: tenant.flatNo, description: maintenanceDescription.trim(),
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
        const errorData = await res.json().catch(() => ({message: "Failed to parse server error."}));
        throw new Error(errorData.message || "Failed to submit maintenance request.");
      }
      const savedProperty = await res.json();
      setProperty(savedProperty);
      setMessage("Maintenance request submitted successfully.");
      setIsMaintenanceModalOpen(false); // Close modal on success
      setMaintenanceDescription(""); // Clear description
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Raise request error:", error);
      setProperty(originalProperty);
      setMessage(`Error submitting request: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDeleteRequest = async (requestIdToDelete) => {
    // ... (keep similar, use general isActionLoading or a specific one if preferred)
    if (!property || !requestIdToDelete || !window.confirm("Are you sure you want to delete this request?")) return;
    if (!API_BASE_URL) { setMessage('API URL is not configured.'); return; }
    setIsActionLoading(true); // Use general action loader for this
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
        throw new Error(errorData.message || "Failed to delete request.");
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

  if (loading) { /* ... Loading JSX ... */ }
  if (pageError) { /* ... Page Error JSX ... */ }
  if (!tenant || !property) { /* ... Data Error JSX (ensure message is set if this hits) ... */ }

  const tenantMaintenanceRequests = (property.maintenanceRequests || []).filter(req => req.flatNo === tenant.flatNo).sort((a,b) => new Date(b.date) - new Date(a.date));
  const tenantPaymentHistory = (tenant.paymentHistory || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  const ownerNotifications = (tenant.notifiedMessages || []).sort((a,b) => new Date(b.date) - new Date(a.date));

  const isStripeReady = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
  const canPayRent = tenant.paymentStatus === "Pending" && tenant.rentAmount > 0 && API_BASE_URL && isStripeReady;

  return (
    <Fragment> {/* Use Fragment if Modal is sibling */}
      <div className="tenant-dashboard-page-wrapper">
        <div className="tenant-dashboard-container tenant-animate-on-load is-visible">
          <header className="tenant-dashboard-header">
            {/* ... Header JSX ... */}
          </header>

          {message && (
              <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('warning') ? 'error' : 'success'}`}>{message}</p>
          )}

          <section className="tenant-info-section card-style">
            {/* ... Tenant Info JSX ... */}
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
              onClick={openMaintenanceModal} // Changed to open modal
              disabled={isActionLoading || !API_BASE_URL}
              title={!API_BASE_URL ? "API not configured" : ""}
            >
              Raise Maintenance Request
            </button>
          </section>

          <div className="dashboard-columns-wrapper">
              <section className="dashboard-column maintenance-column card-style scrollable-list">
                  <h4 className="column-title">My Maintenance Requests</h4>
                  {/* ... Maintenance List JSX ... */}
              </section>

              <section className="dashboard-column payment-column card-style scrollable-list">
                  <h4 className="column-title">My Payment History</h4>
                  {/* ... Payment History List JSX ... */}
              </section>
          </div>

          <section className="notifications-section card-style scrollable-list">
              <h4 className="column-title">Notifications from Owner</h4>
              {/* ... Notifications List JSX ... */}
          </section>
        </div>
      </div>

      {/* Maintenance Request Modal */}
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
// Loading, PageError, DataError JSX (simplified here for brevity)
if (loading) return <div className="page-feedback-container"><div className="loading-spinner-large"></div><p>Loading Dashboard...</p></div>;
if (pageError) return <div className="page-feedback-container error-message"><h2>Application Error</h2><p>{pageError}</p><button onClick={() => navigate('/login')}>Go to Login</button></div>;
if (!tenant || !property) return <div className="page-feedback-container error-message"><h2>Data Error</h2><p>{message || "Could not load information."}</p><button onClick={() => navigate('/login')}>Go to Login</button></div>;

// Helper for list items (example for maintenance)
// const MaintenanceItem = ({ req, onDelete, isLoading }) => (
//   <div className="info-card maintenance-card">
//     <p><strong>Issue:</strong> {req.description}</p>
//     <p><strong>Status:</strong> <span className={`status-pill status-${(req.status || 'pending').toLowerCase().replace(' ', '-')}`}>{req.status}</span></p>
//     {/* ... more details and delete button ... */}
//   </div>
// );


export default TenantDashboard;
