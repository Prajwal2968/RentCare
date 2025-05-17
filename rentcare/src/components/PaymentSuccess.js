// frontend/src/components/PaymentSuccess.js
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { flatNo, propertyId } = useParams();

  useEffect(() => {
    const updatePaymentStatusInDB = async () => {
      try {
        if (!propertyId || !flatNo) {
          throw new Error("Missing property ID or flat number.");
        }

        // Fetch the property to get the tenant's current rentAmount
        const propRes = await fetch(`http://localhost:5001/properties/${propertyId}`);
        if (!propRes.ok) {
            const errorData = await propRes.json();
            throw new Error(`Failed to fetch property: ${errorData.message || propRes.statusText}`);
        }
        const property = await propRes.json();
        const tenant = property.tenants.find((t) => t.flatNo === flatNo);

        if (!tenant) {
            throw new Error("Tenant not found in property data.");
        }
        
        // Call the new dedicated backend endpoint
        const updateRes = await fetch(`http://localhost:5001/properties/${propertyId}/tenants/${flatNo}/payment-success`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rentAmount: tenant.rentAmount }), // Send the original rentAmount
        });

        if (!updateRes.ok) {
          const errorData = await updateRes.json();
          throw new Error(`Failed to update payment status: ${errorData.error || updateRes.statusText}`);
        }
        
        navigate(`/TenantDashboard/${propertyId}/${flatNo}`);
      } catch (error) {
        console.error("Payment success processing error:", error.message);
        alert(`Payment processing encountered an issue: ${error.message}. Please contact support or check your dashboard later.`);
        if (propertyId && flatNo) {
            navigate(`/TenantDashboard/${propertyId}/${flatNo}`);
        } else {
            navigate('/'); 
        }
      }
    };

    updatePaymentStatusInDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, flatNo, propertyId]);

  return <div className="text-center p-4 text-lg font-semibold">Processing payment success, please wait...</div>;
};

export default PaymentSuccess;