// frontend/src/components/PaymentSuccess.js
import { useEffect, useState } from "react"; // Added useState for error message
import { useNavigate, useParams } from "react-router-dom";

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { flatNo, propertyId } = useParams();
  const [processingMessage, setProcessingMessage] = useState("Processing payment success, please wait...");
  const [errorOccurred, setErrorOccurred] = useState(false);

  useEffect(() => {
    // Log essential variables on mount for debugging
    console.log("PaymentSuccess Mounted. Params:", { propertyId, flatNo });
    console.log("PaymentSuccess - API_BASE_URL:", API_BASE_URL);

    if (!API_BASE_URL) {
      console.error("CRITICAL: API_BASE_URL is not set. Cannot process payment success.");
      setProcessingMessage("Configuration Error: Cannot finalize payment. Please contact support.");
      setErrorOccurred(true);
      // Optionally navigate away or show a persistent error
      // setTimeout(() => navigate('/'), 5000); // Example: navigate to home after 5s
      return;
    }

    const updatePaymentStatusInDB = async () => {
      try {
        if (!propertyId || !flatNo) {
          throw new Error("Missing property ID or flat number from URL. Cannot process.");
        }

        // Fetch the property to get the tenant's current rentAmount
        console.log(`Fetching property: ${API_BASE_URL}/properties/${propertyId}`);
        const propRes = await fetch(`${API_BASE_URL}/properties/${propertyId}`);
        if (!propRes.ok) {
            let errorData;
            try {
                errorData = await propRes.json();
            } catch(e) {
                throw new Error(`Failed to fetch property (Status: ${propRes.status}, ${propRes.statusText}). Non-JSON response.`);
            }
            throw new Error(`Failed to fetch property: ${errorData.message || propRes.statusText}`);
        }
        const property = await propRes.json();
        if (!property || !property.tenants) {
            throw new Error("Invalid property data received.");
        }
        const tenant = property.tenants.find((t) => t.flatNo === flatNo);

        if (!tenant) {
            throw new Error(`Tenant for Flat No: ${flatNo} not found in property data.`);
        }
        if (typeof tenant.rentAmount === 'undefined') {
            throw new Error(`Rent amount for Tenant (Flat No: ${flatNo}) is not defined.`);
        }
        
        // Call the new dedicated backend endpoint
        const updateUrl = `${API_BASE_URL}/properties/${propertyId}/tenants/${flatNo}/payment-success`;
        console.log(`Updating payment status at: ${updateUrl} with rentAmount: ${tenant.rentAmount}`);
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rentAmount: tenant.rentAmount }), // Send the original rentAmount
        });

        if (!updateRes.ok) {
          let errorData;
            try {
                errorData = await updateRes.json();
            } catch(e) {
                throw new Error(`Failed to update payment status (Status: ${updateRes.status}, ${updateRes.statusText}). Non-JSON response.`);
            }
          throw new Error(`Failed to update payment status: ${errorData.error || errorData.message || updateRes.statusText}`);
        }
        
        console.log("Payment status updated successfully. Navigating to dashboard.");
        // Navigate to tenant dashboard upon successful update
        navigate(`/TenantDashboard/${propertyId}/${flatNo}`);

      } catch (error) {
        console.error("Payment success processing error:", error.message);
        // Using alert is generally not recommended for modern UX, prefer in-page messages
        // alert(`Payment processing encountered an issue: ${error.message}. Please contact support or check your dashboard later.`);
        setProcessingMessage(`Payment processing encountered an issue: ${error.message}. You will be redirected shortly. Please check your dashboard later or contact support.`);
        setErrorOccurred(true);
        // Navigate to tenant dashboard even on error, so they can see status, or to a generic error page
        // Allowing a few seconds for the user to read the error message.
        setTimeout(() => {
            if (propertyId && flatNo) {
                navigate(`/TenantDashboard/${propertyId}/${flatNo}`);
            } else {
                navigate('/'); // Fallback to home if params are missing
            }
        }, 5000); // Redirect after 5 seconds
      }
    };

    updatePaymentStatusInDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, flatNo, propertyId]); // API_BASE_URL is module-level, not a reactive dependency here

  return (
    <div className={`payment-status-page ${errorOccurred ? 'payment-error' : 'payment-processing'}`}>
      <div className="status-container">
        {errorOccurred ? (
          <svg className="status-icon error-icon" /* Error Icon SVG */ xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" > <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /> </svg>
        ) : (
          <div className="loading-spinner-payment"></div> // Simple spinner
        )}
        <p className="status-message">{processingMessage}</p>
        {errorOccurred && (
          <button 
            onClick={() => propertyId && flatNo ? navigate(`/TenantDashboard/${propertyId}/${flatNo}`) : navigate('/')}
            className="dashboard-button primary"
          >
            Go to Dashboard
          </button>
        )}
      </div>
      <style jsx>{`
        .payment-status-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          padding: 20px;
          text-align: center;
        }
        .status-container {
          background-color: #f9f9f9;
          padding: 30px 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .status-message {
          font-size: 1.1rem;
          color: #333;
          margin-top: 15px;
          margin-bottom: 20px;
          max-width: 400px;
        }
        .payment-error .status-message {
            color: #D8000C; /* Error red */
        }
        .status-icon {
            width: 50px;
            height: 50px;
            margin: 0 auto 15px auto;
        }
        .error-icon {
            stroke: #D8000C;
        }
        .loading-spinner-payment {
          border: 4px solid #f3f3f3; /* Light grey */
          border-top: 4px solid #3498db; /* Blue */
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .dashboard-button.primary { /* Basic styling, adapt to your project */
            background-color: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-color 0.2s;
        }
        .dashboard-button.primary:hover {
            background-color: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccess;
