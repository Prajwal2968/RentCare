import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import './OwnerMaintenanceRequests.css'; // Link to new CSS file

const OwnerMaintenanceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Added for loading state
  
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const { propertyId, propertyName: passedPropertyName, flatNo: filterFlatNo } = location.state || {}; // Get propertyId, propertyName, and optional flatNo

  useEffect(() => {
    // Initial load animations
    const elementsToAnimate = document.querySelectorAll('.maintenance-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      setTimeout(() => {
        el.classList.add('is-visible');
      }, delay + index * 50); 
    });
  }, [isLoading, requests]); // Re-run if isLoading or requests change

  useEffect(() => {
    if (propertyId) {
      fetchPropertyAndRequests();
    } else {
      setMessage("Property ID not provided. Please go back and select a property.");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchPropertyAndRequests = () => {
    setIsLoading(true);
    axios.get(`http://localhost:5001/properties/${propertyId}`)
      .then((response) => {
        const prop = response.data;
        setProperty(prop);

        const tenantMap = {};
        (prop.tenants || []).forEach((tenant) => {
          tenantMap[tenant.flatNo] = tenant.name;
        });

        let fetchedRequests = (prop.maintenanceRequests || []).map((req) => ({
          ...req,
          tenantName: tenantMap[req.flatNo] || 'N/A (Tenant may be deleted)',
        }));

        // If filterFlatNo is provided, filter requests for that specific tenant
        if (filterFlatNo) {
            fetchedRequests = fetchedRequests.filter(req => req.flatNo === filterFlatNo);
        }

        setRequests(fetchedRequests);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching property data for maintenance:', error);
        setMessage(`Error fetching data: ${error.response?.data?.message || error.message}`);
        setIsLoading(false);
        setTimeout(() => setMessage(''), 5000);
      });
  };

  const handleStatusChange = (reqId, newStatus) => { // Use reqId (unique ID from DB)
    const updated = requests.map(req => 
      req.id === reqId ? { ...req, status: newStatus } : req
    );
    setRequests(updated);
  };

  const handleRemarksChange = (reqId, newRemarks) => { // Use reqId
    const updated = requests.map(req =>
      req.id === reqId ? { ...req, remarks: newRemarks } : req
    );
    setRequests(updated);
  };

  const handleDelete = async (reqIdToDelete) => { // Use reqId
    if (!property || !window.confirm("Are you sure you want to delete this maintenance request?")) return;
    setIsLoading(true);
    
    const updatedMaintenanceRequestsForDB = (property.maintenanceRequests || [])
        .filter(req => req.id !== reqIdToDelete) // Filter out by unique ID
        .map(({ tenantName, ...rest }) => rest); // tenantName is UI only

    const updatedProperty = {
      ...property,
      maintenanceRequests: updatedMaintenanceRequestsForDB,
    };

    try {
      await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      
      // Update local state for UI based on the same unique ID
      const updatedUIRequests = requests.filter(req => req.id !== reqIdToDelete);
      setRequests(updatedUIRequests);
      setProperty(updatedProperty); 

      setMessage('Maintenance request deleted successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to delete maintenance request:', error);
      setMessage(`Failed to delete request: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveAllChanges = async () => {
    if (!property) return;
    setIsLoading(true);
    try {
      const maintenanceRequestsForDB = requests.map(({ tenantName, ...rest }) => rest);
      const updatedProperty = {
        ...property,
        maintenanceRequests: maintenanceRequestsForDB,
      };

      await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(updatedProperty); 
      // Re-fetch to ensure data consistency, including tenant names if they could change
      // Or, if confident, just update local `requests` state directly with the saved versions
      // For simplicity, re-fetching after save ensures everything is synced.
      await fetchPropertyAndRequests(); 
      setMessage('All maintenance request changes saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update maintenance requests:', error);
      setMessage(`Failed to save changes: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
        setIsLoading(false);
    }
  };

  if (!propertyId) {
    return (
        <div className="maintenance-page-wrapper">
            <div className="maintenance-container maintenance-animate-on-load">
                <p className="page-message error">No property selected. Please go back.</p>
                <button className="dashboard-button" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        </div>
    );
  }
  
  const pageTitle = filterFlatNo 
    ? `Maintenance for Flat ${filterFlatNo} (${requests.find(r => r.flatNo === filterFlatNo)?.tenantName || 'Tenant'})`
    : `All Maintenance for ${property?.name || passedPropertyName || 'Property'}`;


  return (
    <div className="maintenance-page-wrapper">
      <div className="maintenance-container maintenance-animate-on-load" data-delay="0">
        <header className="maintenance-header maintenance-animate-on-load" data-delay="50">
          <div className="maintenance-title-group">
            <button className="back-button" onClick={() => navigate(-1)} aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="maintenance-main-title">{pageTitle}</h2>
          </div>
           {/* Save All button appears if there are requests */}
           {requests.length > 0 && !isLoading && (
             <button
                onClick={handleSaveAllChanges}
                className="dashboard-button primary save-all-btn"
                disabled={isLoading}
            >
                {isLoading ? <span className="spinner"></span> : 'Save All Changes'}
            </button>
           )}
        </header>

        {message && (
            <p className={`dashboard-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'success'} maintenance-animate-on-load`} data-delay="100">
                {message}
            </p>
        )}
        
        {isLoading && (
            <div className="loading-container"><span className="loading-spinner-large"></span><p className="loading-text">Loading requests...</p></div>
        )}

        {!isLoading && requests.length === 0 && (
            <div className="no-data-container maintenance-animate-on-load" data-delay="150">
                <svg className="no-data-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <p className="no-data-text">No maintenance requests found.</p>
                <p className="no-data-subtext">
                    {filterFlatNo ? `This tenant hasn't submitted any requests yet.` : `No requests submitted for this property.`}
                </p>
            </div>
        )}

        {!isLoading && requests.length > 0 && (
          <div className="maintenance-table-wrapper maintenance-animate-on-load" data-delay="150">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>#</th>
                  {!filterFlatNo && <th>Tenant</th>} {/* Show Tenant Name only if not filtering by flat */}
                  {!filterFlatNo && <th>Flat No</th>}
                  <th>Description</th>
                  <th>Status</th>
                  <th>Owner Remarks</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => (
                  <tr key={req.id || index}> {/* Backend should provide unique req.id */}
                    <td data-label="#">{index + 1}</td>
                    {!filterFlatNo && <td data-label="Tenant">{req.tenantName}</td>}
                    {!filterFlatNo && <td data-label="Flat No">{req.flatNo}</td>}
                    <td data-label="Description" className="description-cell">{req.description}</td>
                    <td data-label="Status">
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)} // Use req.id
                        className={`status-dropdown status-${req.status?.toLowerCase().replace(/\s+/g, '-')}`}
                        disabled={isLoading}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td data-label="Remarks">
                      <textarea
                        value={req.remarks || ''}
                        onChange={(e) => handleRemarksChange(req.id, e.target.value)} // Use req.id
                        placeholder="Add remarks..."
                        className="remarks-textarea"
                        rows="2"
                        disabled={isLoading}
                      />
                    </td>
                    <td data-label="Submitted">{new Date(req.date).toLocaleDateString()}</td>
                    <td data-label="Action">
                      <button
                        onClick={() => handleDelete(req.id)} // Use req.id
                        className="dashboard-button delete-request-btn"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerMaintenanceRequests;