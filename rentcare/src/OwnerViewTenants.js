import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './OwnerViewTenants.css'; // Make sure this CSS file exists and is styled

// Re-using the EyeIcon, ensure it's defined or imported
const EyeIcon = ({ Rendersolid = false, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill={Rendersolid ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    style={{width: '18px', height: '18px', cursor: 'pointer'}}
    {...props}
  >
    {Rendersolid ? ( 
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ) : ( 
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 12 4.5c4.756 0 8.773 3.162 10.02 7.48.013.046.028.092.042.138m-9.028 4.34c.607.848 1.147 1.746 1.623 2.69M1.377 19.123A10.523 10.523 0 0 0 12 20.25c2.085 0 4.042-.588 5.623-1.623m0 0c.607-.848 1.147-1.746 1.623-2.69M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 4.755l-16.49 16.49" />
      </>
    )}
  </svg>
);

const OwnerViewTenants = () => {
  const [property, setProperty] = useState(null); // Store the whole property object
  const [tenants, setTenants] = useState([]);
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);
  const [editingTenantFlatNo, setEditingTenantFlatNo] = useState(null); 
  const [editedRent, setEditedRent] = useState('');
  const [newTenant, setNewTenant] = useState({
    name: '', flatNo: '', username: '', password: '', 
    paymentStatus: 'Pending', rentAmount: '',
    lastNotify: new Date().toISOString().split('T')[0],
    paymentHistory: [], notifiedMessages: [],
  });
  const [showNewTenantPassword, setShowNewTenantPassword] = useState(false);
  const [visiblePasswordsInTable, setVisiblePasswordsInTable] = useState({}); // For table
  const [notificationMessage, setNotificationMessage] = useState(''); 
  const [showMessageInputForFlatNo, setShowMessageInputForFlatNo] = useState(null);
  const [pageMessage, setPageMessage] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);


  const location = useLocation();
  const navigate = useNavigate();
  const { propertyId, propertyName } = location.state || {};

  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll('.tenant-view-animate-on-load');
    elementsToAnimate.forEach((el) => {
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => {
          el.classList.add('is-visible');
        }, delay); 
    });
  }, [isLoading, tenants, showAddTenantForm, pageMessage]);


  useEffect(() => {
    if (propertyId) {
      fetchPropertyAndTenants();
    } else {
      setPageMessage("Property ID not provided. Please go back and select a property.");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchPropertyAndTenants = () => {
    setIsLoading(true);
    axios.get(`http://localhost:5001/properties/${propertyId}`)
      .then((response) => {
        const fetchedProperty = response.data;
        setProperty(fetchedProperty);
        setTenants(fetchedProperty.tenants || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching property and tenants:', error);
        setPageMessage(`Error fetching data: ${error.response?.data?.message || error.message}`);
        setIsLoading(false);
        setTimeout(() => setPageMessage(''), 5000);
      });
  };

  const resetNewTenantForm = () => {
    setNewTenant({ 
        name: '', flatNo: '', username: '', password: '', 
        paymentStatus: 'Pending', rentAmount: '', 
        lastNotify: new Date().toISOString().split('T')[0], 
        paymentHistory: [], notifiedMessages: [] 
    });
    setShowNewTenantPassword(false);
  };

  const handleAddTenantClick = () => {
    setShowAddTenantForm(!showAddTenantForm);
    if (showAddTenantForm) { 
      resetNewTenantForm();
      setPageMessage(''); 
    }
  };

  const handleInputChange = (e) => {
    setNewTenant({ ...newTenant, [e.target.name]: e.target.value });
  };

  const handleAddTenantSubmit = async (e) => {
    e.preventDefault(); 
    if (!property) { setPageMessage("Property data not loaded."); return; }
    if (!newTenant.name || !newTenant.flatNo || !newTenant.username || !newTenant.password || !newTenant.rentAmount) {
        setPageMessage("Please fill all required fields for the new tenant."); 
        setTimeout(() => setPageMessage(''), 3000); return;
    }
    setIsActionLoading(true);
    // The backend should assign a unique ID (like _id from MongoDB) to the new tenant
    // We don't need to generate `id: t${Date.now()}` if the backend handles it.
    const tenantToAdd = { ...newTenant, rentAmount: Number(newTenant.rentAmount) }; 
    
    const updatedProperty = {
        ...property,
        tenants: [...(property.tenants || []), tenantToAdd]
    };
    try {
      const response = await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(response.data); 
      setTenants(response.data.tenants || []); // Refresh tenants from server response
      setShowAddTenantForm(false);
      resetNewTenantForm();
      setPageMessage("Tenant added successfully!");
      setTimeout(() => setPageMessage(''), 3000);
    } catch (error) {
      console.error('Failed to add tenant:', error);
      setPageMessage(`Failed to add tenant: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setPageMessage(''), 5000);
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleEditRent = (tenantFlatNo, currentRent) => { setEditingTenantFlatNo(tenantFlatNo); setEditedRent(String(currentRent)); };

  const handleSaveRent = async (targetFlatNo) => {
    if (!property || editedRent.trim() === '') return;
    setIsActionLoading(true);
    const updatedTenants = (property.tenants || []).map(t => t.flatNo === targetFlatNo ? { ...t, rentAmount: Number(editedRent) } : t);
    const updatedProperty = { ...property, tenants: updatedTenants };
    try {
      const response = await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(response.data); setTenants(response.data.tenants || []); setEditingTenantFlatNo(null); setEditedRent('');
      setPageMessage("Rent updated successfully!"); setTimeout(() => setPageMessage(''), 3000);
    } catch (error) { console.error('Failed to update rent:', error); setPageMessage(`Failed to update rent: ${error.response?.data?.message || error.message}`); setTimeout(() => setPageMessage(''), 5000); }
    finally { setIsActionLoading(false); }
  };

  const handleStatusChange = async (tenantFlatNo, newStatus) => { // Changed from targetFlatNo to tenantFlatNo for clarity
    if (!property) return;
    setIsActionLoading(true);
    const updatedTenants = (property.tenants || []).map(t => t.flatNo === tenantFlatNo ? { ...t, paymentStatus: newStatus } : t );
    const updatedProperty = { ...property, tenants: updatedTenants };
    try {
      const response = await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(response.data); setTenants(response.data.tenants || []);
      setPageMessage("Payment status updated successfully!"); setTimeout(() => setPageMessage(''), 3000);
    } catch (error) { console.error('Failed to update payment status:', error); setPageMessage(`Failed to update status: ${error.response?.data?.message || error.message}`); setTimeout(() => setPageMessage(''), 5000); }
    finally { setIsActionLoading(false); }
  };

  const handleNotifyTenant = async (targetFlatNo) => {
    if (!property || notificationMessage.trim() === '') { setPageMessage('Please enter a message to notify the tenant.'); setTimeout(() => setPageMessage(''), 3000); return; }
    setIsActionLoading(true);
    const newMessageObject = { date: new Date().toISOString().split('T')[0], message: notificationMessage, };
    const updatedTenants = (property.tenants || []).map(t => { if (t.flatNo === targetFlatNo) { return { ...t, notifiedMessages: [...(t.notifiedMessages || []), newMessageObject], lastNotify: newMessageObject.date }; } return t; });
    const updatedProperty = { ...property, tenants: updatedTenants };
    try {
      const response = await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(response.data); setTenants(response.data.tenants || []); setNotificationMessage(''); setShowMessageInputForFlatNo(null);
      setPageMessage("Tenant notified successfully!"); setTimeout(() => setPageMessage(''), 3000);
    } catch (error) { console.error('Failed to notify tenant:', error); setPageMessage(`Failed to notify tenant: ${error.response?.data?.message || error.message}`); setTimeout(() => setPageMessage(''), 5000); }
    finally { setIsActionLoading(false); }
  };
  
  const handleDeleteTenant = async (tenantFlatNoToDelete) => {
    if (!property || !window.confirm(`Are you sure you want to delete tenant in Flat ${tenantFlatNoToDelete}? This action cannot be undone.`)) { return; }
    setIsActionLoading(true);
    const updatedTenants = (property.tenants || []).filter(t => t.flatNo !== tenantFlatNoToDelete);
    const updatedProperty = { ...property, tenants: updatedTenants };
    try {
      const response = await axios.put(`http://localhost:5001/properties/${propertyId}`, updatedProperty);
      setProperty(response.data); setTenants(response.data.tenants || []);
      setPageMessage(`Tenant in Flat ${tenantFlatNoToDelete} deleted successfully.`); setTimeout(() => setPageMessage(''), 3000);
    } catch (error) { console.error('Failed to delete tenant:', error); setPageMessage(`Failed to delete tenant: ${error.response?.data?.message || error.message}`); setTimeout(() => setPageMessage(''), 5000); }
    finally { setIsActionLoading(false); }
  };

  const toggleTablePasswordVisibility = (tenantFlatNo) => { // Renamed for clarity
    setVisiblePasswordsInTable(prev => ({ ...prev, [tenantFlatNo]: !prev[tenantFlatNo] }));
  };

  if (!propertyId && !isLoading) {
    return (
        <div className="tenant-view-page-wrapper">
            <div className="tenant-view-container tenant-view-animate-on-load is-visible">
                <p className="page-message error">No property selected. Please go back to your dashboard.</p>
                <button className="dashboard-button primary" onClick={() => navigate(-1)}>Go Back to Dashboard</button>
            </div>
        </div>
    );
  }

  if (isLoading && !property) {
    return (
    <div className="tenant-view-page-wrapper">
        <div className="loading-container tenant-view-animate-on-load is-visible">
            <span className="loading-spinner-large"></span>
            <p className="loading-text">Loading Property & Tenant Details...</p>
        </div>
    </div>
    );
  }
  
  // If property is loaded, but tenants might still be loading (though fetchPropertyAndTenants sets both)
  // The main isLoading flag should cover both property and initial tenant load.

  return (
    <div className="tenant-view-page-wrapper">
      <div className="tenant-view-container tenant-view-animate-on-load" data-delay="0">
        <header className="tenant-view-header tenant-view-animate-on-load" data-delay="50">
            <div className="tenant-view-title-group">
            <button className="back-button" onClick={() => navigate(-1)} aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="logo tenant-dashboard-logo">
              <svg width="36" height="30" viewBox="0 0 36 30" className="logo-icon" aria-hidden="true">
                <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#1e3a8a"/>
                <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50"/>
              </svg>
            </div>
            <h2 className="tenant-view-main-title">Manage Tenants</h2>
          </div>
          <button className="dashboard-button primary add-tenant-btn" onClick={handleAddTenantClick} disabled={isActionLoading}>
            {showAddTenantForm ? 'Cancel Adding' : '+ Add Tenant'}
          </button>
        </header>
        <p className="property-context-text tenant-view-animate-on-load" data-delay="100">
            Property: <strong>{property?.name || propertyName || 'Loading...'}</strong>
            {property?.location && ` - ${property.location}`}
        </p>

        {pageMessage && (
          <p className={`dashboard-message ${pageMessage.toLowerCase().includes('error') || pageMessage.toLowerCase().includes('failed') ? 'error' : 'success'} tenant-view-animate-on-load`} data-delay="150">
            {pageMessage}
          </p>
        )}

        {showAddTenantForm && (
          <section className="add-tenant-form-section tenant-view-animate-on-load" data-delay="200">
            <h3 className="form-title">Add New Tenant</h3>
            <form className="tenant-form" onSubmit={handleAddTenantSubmit}>
              <input name="name" placeholder="Tenant Name" value={newTenant.name} onChange={handleInputChange} required className="dashboard-input"/>
              <input name="flatNo" placeholder="Flat No." value={newTenant.flatNo} onChange={handleInputChange} required className="dashboard-input"/>
              <input name="username" placeholder="Username" value={newTenant.username} onChange={handleInputChange} required className="dashboard-input"/>
              <div className="input-group password-input-group">
                <input 
                  name="password" 
                  type={showNewTenantPassword ? "text" : "password"} 
                  placeholder="Create Password" 
                  value={newTenant.password} 
                  onChange={handleInputChange} 
                  required 
                  className="dashboard-input"
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowNewTenantPassword(!showNewTenantPassword)}
                  aria-label={showNewTenantPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon Rendersolid={showNewTenantPassword} />
                </button>
              </div>
              <input name="rentAmount" placeholder="Rent Amount (₹)" type="number" value={newTenant.rentAmount} onChange={handleInputChange} required className="dashboard-input"/>
              <select name="paymentStatus" value={newTenant.paymentStatus} onChange={handleInputChange} className="dashboard-input status-dropdown-form">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
              <button type="submit" className="dashboard-button primary save-btn add-tenant-submit-btn" disabled={isActionLoading}>
                {isActionLoading ? <span className="spinner"></span> : "Add Tenant"}
              </button>
            </form>
          </section>
        )}

        <section className="tenant-list-section tenant-view-animate-on-load" data-delay={showAddTenantForm ? "500" : "250"}>
            {isLoading && tenants.length === 0 && (
                 <div className="loading-container"><span className="loading-spinner-large"></span><p className="loading-text">Loading tenants...</p></div>
            )}
            {!isLoading && tenants.length === 0 && (
                <div className="no-data-container tenant-view-animate-on-load" data-delay={showAddTenantForm ? "600" : "350"}>
                    <svg className="no-data-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1M14.25 3l1.5.545M11.25 3l-1.5.545M14.25 6.205 12 7.5m5.25 2.25L12 10.5M8.25 15l-3-1.091" />
                    </svg>
                    <p className="no-data-text">No tenants found for this property.</p>
                    <p className="no-data-subtext">Click "+ Add Tenant" to get started.</p>
                </div>
            )}
            {tenants.length > 0 && !isLoading && (
            <div className="tenant-table-wrapper">
                <table className="tenant-table">
                <thead>
                    <tr>
                    <th>#</th><th>Name</th><th>Flat No</th><th>Username</th>
                    <th>Password</th>
                    <th>Status</th><th>Rent (₹)</th><th>Last Notified</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tenants.map((tenant, index) => (
                    <React.Fragment key={tenant.id || tenant.flatNo}> 
                    <tr>
                        <td data-label="#">{index + 1}</td>
                        <td data-label="Name">{tenant.name}</td>
                        <td data-label="Flat No">{tenant.flatNo}</td>
                        <td data-label="Username">{tenant.username}</td>
                        <td data-label="Password" className="password-cell-table">
                            <span>
                                {visiblePasswordsInTable[tenant.flatNo] ? tenant.password : "••••••••"}
                            </span>
                            <button 
                                type="button"
                                className="password-toggle-btn-table"
                                onClick={() => toggleTablePasswordVisibility(tenant.flatNo)}
                                aria-label={visiblePasswordsInTable[tenant.flatNo] ? "Hide password" : "Show password"}
                            >
                                <EyeIcon Rendersolid={visiblePasswordsInTable[tenant.flatNo]} />
                            </button>
                        </td>
                        <td data-label="Status">
                        <select
                            value={tenant.paymentStatus}
                            onChange={(e) => handleStatusChange(tenant.flatNo, e.target.value)}
                            className={`status-dropdown status-${tenant.paymentStatus?.toLowerCase()}`}
                            disabled={isActionLoading}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                        </select>
                        </td>
                        <td data-label="Rent (₹)">
                        {editingTenantFlatNo === tenant.flatNo ? (
                            <input
                            type="number" value={editedRent}
                            onChange={(e) => setEditedRent(e.target.value)}
                            className="rent-input"
                            onBlur={() => handleSaveRent(tenant.flatNo)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRent(tenant.flatNo)}
                            disabled={isActionLoading}
                            />
                        ) : ( <span onClick={() => handleEditRent(tenant.flatNo, tenant.rentAmount)} className="rent-value">₹{tenant.rentAmount}</span> )}
                        </td>
                        <td data-label="Last Notified">{tenant.lastNotify ? new Date(tenant.lastNotify).toLocaleDateString() : 'N/A'}</td>
                        <td data-label="Actions" className="action-column">
                            {editingTenantFlatNo === tenant.flatNo ? (
                                <button className="dashboard-button action-btn save-rent-btn" onClick={() => handleSaveRent(tenant.flatNo)} disabled={isActionLoading}>Save</button>
                            ) : (
                                <button className="dashboard-button action-btn edit-rent-btn" onClick={() => handleEditRent(tenant.flatNo, tenant.rentAmount)} disabled={isActionLoading}>Edit Rent</button>
                            )}
                            <button className="dashboard-button action-btn maintenance-requests-btn" onClick={() => navigate('/owner/maintenance', { state: { propertyId: property.id, flatNo: tenant.flatNo, tenantName: tenant.name } })} disabled={isActionLoading}>Maintenance</button>
                            <button className="dashboard-button action-btn notify-tenant-btn" onClick={() => setShowMessageInputForFlatNo(prev => prev === tenant.flatNo ? null : tenant.flatNo)} disabled={isActionLoading}>
                                {showMessageInputForFlatNo === tenant.flatNo ? 'Cancel' : 'Notify'}
                            </button>
                            <button className="dashboard-button action-btn delete-tenant-btn" onClick={() => handleDeleteTenant(tenant.flatNo)} disabled={isActionLoading}>Delete</button>
                        </td>
                    </tr>
                    {showMessageInputForFlatNo === tenant.flatNo && (
                        <tr className="notification-input-row">
                            <td colSpan="9">
                                <div className="notification-form">
                                    <input type="text" placeholder="Enter message for tenant..." value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} className="dashboard-input notification-message-input" disabled={isActionLoading} />
                                    <button className="dashboard-button primary send-notify-btn" onClick={() => handleNotifyTenant(tenant.flatNo)} disabled={isActionLoading || notificationMessage.trim() === ''}>
                                        {isActionLoading ? <span className="spinner"></span> : "Send"}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )}
                    </React.Fragment>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default OwnerViewTenants;