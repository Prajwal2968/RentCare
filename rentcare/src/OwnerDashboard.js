import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './OwnerDashboard.css';

// Define API_BASE_URL using environment variable, which you'll set in Vercel
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const OwnerDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', location: '' });
  const [message, setMessage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const { ownerId } = useParams();

  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll('.owner-animate-on-load');
    elementsToAnimate.forEach((el) => {
        const delay = parseInt(el.dataset.delay || "0", 10);
        if (!el.classList.contains('is-visible')) {
          setTimeout(() => {
            el.classList.add('is-visible');
          }, delay); 
        }
    });
  }, [isLoading, properties, showForm]); 

  useEffect(() => {
    // First, check if the API URL is even configured
    if (!API_BASE_URL) {
      setMessage('Error: API URL is not configured.');
      console.error("REACT_APP_API_BASE_URL is not set in your Vercel environment variables.");
      setIsLoading(false);
      return;
    }
    // Next, ensure ownerId is present before trying to fetch
    if (ownerId) {
      fetchProperties();
    } else {
      setMessage("Error: Owner ID is missing. Cannot load properties.");
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const fetchProperties = async () => {
    setIsLoading(true);
    setMessage('');
    
    // --- MODIFICATION START ---
    // Construct the URL with the ownerId to fetch only their properties.
    // This tells the backend to filter the results.
    const fetchUrl = `${API_BASE_URL}/properties?ownerId=${ownerId}`;
    // --- MODIFICATION END ---
    
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        let errorMsg = `HTTP error! status: ${res.status}`;
        try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } 
        catch (jsonError) { errorMsg = res.statusText || errorMsg; }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setMessage('Error fetching properties: ' + error.message);
      setProperties([]);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProperty(prev => ({ ...prev, [name]: value }));
    if (editMode && editingProperty) {
        setEditingProperty(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const resetForm = (msg) => {
    setNewProperty({ name: '', location: '' });
    setEditingProperty(null);
    setEditMode(false);
    setShowForm(false);
    if (msg) {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAddOrUpdateProperty = async (e) => {
    e.preventDefault();
    if (!newProperty.name || !newProperty.location) {
        setMessage("Property name and location are required.");
        setTimeout(() => setMessage(''), 3000);
        return;
    }
    setIsLoading(true);
    
    const propertyData = {
      name: newProperty.name,
      location: newProperty.location,
      tenants: editMode && editingProperty ? editingProperty.tenants || [] : [],
      maintenanceRequests: editMode && editingProperty ? editingProperty.maintenanceRequests || [] : [],
      // This correctly associates the new property with the current owner
      ...(ownerId && !editMode && { ownerId: ownerId })
    };

    const url = editMode
      ? `${API_BASE_URL}/properties/${editingProperty.id}`
      : `${API_BASE_URL}/properties`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });
      const responseData = await res.json(); 
      if (!res.ok) {
        throw new Error(responseData.message || `Failed to ${editMode ? 'update' : 'add'} property.`);
      }
      resetForm(`Property ${editMode ? 'updated' : 'added'} successfully!`);
      await fetchProperties(); 
    } catch (error) {
      console.error('Error saving property:', error);
      setMessage('Error saving property: ' + error.message);
      setTimeout(() => setMessage(''), 5000);
      setIsLoading(false); // Make sure to stop loading on error
    }
  };

  const handleDeleteProperty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/properties/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let errorMsg = `HTTP error! status: ${res.status}`;
        try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } 
        catch (e) { errorMsg = res.statusText || errorMsg; }
        throw new Error(errorMsg);
      }
      setProperties(properties.filter((property) => property.id !== id)); 
      setMessage('Property deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting property:', error);
      setMessage('Error deleting property: ' + error.message);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddForm = () => {
    setShowForm(true);
    setEditMode(false);
    setEditingProperty(null);
    setNewProperty({ name: '', location: '' });
    setMessage(''); 
  };

  const openEditForm = (property) => {
    setShowForm(true);
    setEditMode(true);
    setEditingProperty(property);
    setNewProperty({ name: property.name, location: property.location });
    setMessage(''); 
    const formSection = document.querySelector('.property-form-section');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="owner-dashboard-page-wrapper">
      <div className="dashboard-container owner-animate-on-load" data-delay="0">
        <header className="dashboard-header owner-animate-on-load" data-delay="50">
          <div className="dashboard-header-title-group">
            <svg width="40" height="32" viewBox="0 0 36 30" className="dashboard-logo-icon" aria-hidden="true">
                <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#1e3a8a"/>
                <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50"/>
            </svg>
            <h2 className="dashboard-title">My Properties</h2>
          </div>
          <button 
            className="dashboard-button primary add-property-btn" 
            onClick={showForm && !editMode ? () => resetForm(null) : openAddForm}
            disabled={isLoading && !(showForm && !editMode)}
          >
            {showForm && !editMode ? 'Cancel Add' : '+ Add New Property'}
          </button>
        </header>

        {message && (
          <p className={`dashboard-message ${message.startsWith('Error') ? 'error' : 'success'} owner-animate-on-load`} data-delay="100">
            {message}
          </p>
        )}

        {showForm && (
          <section className="property-form-section owner-animate-on-load" data-delay="150">
            <h3 className="form-title">{editMode ? 'Edit Property Details' : 'Add a New Property'}</h3>
            <form className="property-form" onSubmit={handleAddOrUpdateProperty}>
              <div className="input-group">
                <label htmlFor="propertyName">Property Name</label>
                <input
                  id="propertyName"
                  className="dashboard-input"
                  type="text"
                  name="name"
                  placeholder="e.g., Sunset Apartments"
                  value={newProperty.name}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="input-group">
                <label htmlFor="propertyLocation">Location</label>
                <input
                  id="propertyLocation"
                  className="dashboard-input"
                  type="text"
                  name="location"
                  placeholder="e.g., 123 Main St, Anytown"
                  value={newProperty.location}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="dashboard-button primary save-btn" disabled={isLoading}>
                  {isLoading ? <span className="spinner"></span> : (editMode ? 'Update Property' : 'Add Property')}
                </button>
                <button
                  type="button"
                  className="dashboard-button secondary cancel-btn"
                  onClick={() => resetForm(null)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
        
        <section className="property-list-section owner-animate-on-load" data-delay={showForm ? "400" : "200"}>
            {isLoading && (
                <div className="loading-container"><span className="loading-spinner-large"></span><p className="loading-text">Loading properties...</p></div>
            )}
            {!isLoading && properties.length === 0 && (
                <div className="no-data-container owner-animate-on-load" data-delay={showForm ? "500" : "300"}>
                    <svg className="no-data-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1M14.25 3l1.5.545M11.25 3l-1.5.545M14.25 6.205 12 7.5m5.25 2.25L12 10.5M8.25 15l-3-1.091" />
                    </svg>
                    <p className="no-data-text">No properties listed yet.</p>
                    <p className="no-data-subtext">Click the button above to add your first property!</p>
                </div>
            )}
            {properties.length > 0 && !isLoading && (
              <div className="property-grid">
                {properties.map((property, index) => (
                  <div key={property.id} className="property-card owner-animate-on-load" 
                       data-delay={(showForm ? 600 : 400) + index * 75}>
                    <div className="property-card-header">
                      <h3 className="property-name">{property.name}</h3>
                      <p className="property-location">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="location-icon">
                          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145L10.5 17.65l-.808-.594ZM10 17.65l.007.005L10 17.65l.007.005L10 17.65Z M10 4a4 4 0 100 8 4 4 0 000-8ZM2 10a8 8 0 1116 0 8 8 0 01-16 0Z" clipRule="evenodd" />
                        </svg>
                        {property.location}
                      </p>
                    </div>
                    <div className="property-card-actions">
                      <button
                        className="dashboard-button view-tenants-btn"
                        onClick={() => navigate('/ownerviewtenants', { state: { propertyId: property.id, propertyName: property.name } })}
                        disabled={isLoading}
                      >
                        Manage
                      </button>
                      <button className="dashboard-button edit-details-btn" onClick={() => openEditForm(property)} disabled={isLoading}>
                        Edit
                      </button>
                      <button className="dashboard-button delete-property-btn" onClick={() => handleDeleteProperty(property.id)} disabled={isLoading}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default OwnerDashboard;
