import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './OwnerMaintenanceRequests.css';

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const OwnerMaintenanceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [property, setProperty] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const { propertyId, propertyName: passedPropertyName, flatNo: filterFlatNo } = location.state || {};

  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll('.maintenance-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      if (!el.classList.contains('is-visible')) {
        setTimeout(() => {
          el.classList.add('is-visible');
        }, delay + index * 50);
      }
    });
  }, [isLoading, requests]);

  useEffect(() => {
    if (!API_BASE_URL) {
      setMessage('API URL is not configured. Cannot fetch data.');
      console.error("REACT_APP_API_BASE_URL is not set");
      setIsLoading(false);
      return;
    }
    if (propertyId) {
      fetchPropertyAndRequests();
    } else {
      setMessage("Property ID not provided. Please go back and select a property.");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]); // API_BASE_URL doesn't need to be a dependency here

  const fetchPropertyAndRequests = () => {
    setIsLoading(true);
    axios.get(`${API_BASE_URL}/properties/${propertyId}`) // MODIFIED URL
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

        if (filterFlatNo) {
          fetchedRequests = fetchedRequests.filter(req => req.flatNo === filterFlatNo);
        }

        setRequests(fetchedRequests.sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort by date desc
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching property data for maintenance:', error);
        setMessage(`Error fetching data: ${error.response?.data?.message || error.message}`);
        setIsLoading(false);
        setTimeout(() => setMessage(''), 5000);
      });
  };

  const handleStatusChange = (reqId, newStatus) => {
    const updated = requests.map(req =>
      req.id === reqId ? { ...req, status: newStatus } : req
    );
    setRequests(updated);
  };

  const handleRemarksChange = (reqId, newRemarks) => {
    const updated = requests.map(req =>
      req.id === reqId ? { ...req, remarks: newRemarks } : req
    );
    setRequests(updated);
  };

  const handleDelete = async (reqIdToDelete) => {
    if (!property || !window.confirm("Are you sure you want to delete this maintenance request?")) return;
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }
    setIsLoading(true);

    const updatedMaintenanceRequestsForDB = (property.maintenanceRequests || [])
      .filter(req => req.id !== reqIdToDelete)
      .map(({ tenantName, ...rest }) => rest);

    const updatedProperty = {
      ...property,
      maintenanceRequests: updatedMaintenanceRequestsForDB,
    };

    try {
      await axios.put(`${API_BASE_URL}/properties/${propertyId}`, updatedProperty); // MODIFIED URL
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
    if (!API_BASE_URL) {
        setMessage('API URL is not configured.'); console.error("REACT_APP_API_BASE_URL is not set"); return;
    }
    setIsLoading(true);
    try {
      const maintenanceRequestsForDB = requests.map(({ tenantName, ...rest }) => rest);
      const updatedProperty = {
        ...property,
        maintenanceRequests: maintenanceRequestsForDB,
      };

      await axios.put(`${API_BASE_URL}/properties/${propertyId}`, updatedProperty); // MODIFIED URL
      // Instead of full re-fetch, update local property, or trust local state if backend ensures atomicity
      setProperty(updatedProperty);
      // If you want to be absolutely sure and re-fetch with tenant names:
      // await fetchPropertyAndRequests();
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
  
  if (!API_BASE_URL && !isLoading && message.includes('API URL is not configured')) {
    return (
        <div className="maintenance-page-wrapper">
            <div className="maintenance-container maintenance-animate-on-load is-visible">
                 <p className="page-message error">{message}</p>
                 <button className="dashboard-button" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        </div>
    );
  }


  if (!propertyId && !isLoading) {
    return (
      <div className="maintenance-page-wrapper">
        <div className="maintenance-container maintenance-animate-on-load is-visible">
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

        {message && !message.includes('API URL is not configured') && (
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
                  {!filterFlatNo && <th>Tenant</th>}
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
                  <tr key={req.id || `req-${index}`}> {/* Ensure unique key */}
                    <td data-label="#">{index + 1}</td>
                    {!filterFlatNo && <td data-label="Tenant">{req.tenantName}</td>}
                    {!filterFlatNo && <td data-label="Flat No">{req.flatNo}</td>}
                    <td data-label="Description" className="description-cell">{req.description}</td>
                    <td data-label="Status">
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
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
                        onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                        placeholder="Add remarks..."
                        className="remarks-textarea"
                        rows="2"
                        disabled={isLoading}
                      />
                    </td>
                    <td data-label="Submitted">{new Date(req.date).toLocaleDateString()}</td>
                    <td data-label="Action">
                      <button
                        onClick={() => handleDelete(req.id)}
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
