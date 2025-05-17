import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPanel.css"; // Link to new AdminPanel.css

// Simple eye icon (replace with a proper icon library if you have one)
const EyeIcon = ({ Rendersolid = false, ...props }) => ( // Added ...props to pass down other attributes like onClick
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill={Rendersolid ? "currentColor" : "none"} 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    style={{width: '20px', height: '20px', cursor: 'pointer'}} // Added cursor pointer
    {...props} // Spread other props
  >
    {Rendersolid ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ) : ( // Eye-slash equivalent
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 12 4.5c4.756 0 8.773 3.162 10.02 7.48.013.046.028.092.042.138m-9.028 4.34c.607.848 1.147 1.746 1.623 2.69M1.377 19.123A10.523 10.523 0 0 0 12 20.25c2.085 0 4.042-.588 5.623-1.623m0 0c.607-.848 1.147-1.746 1.623-2.69M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 4.755l-16.49 16.49" /> 
      </>
    )}
  </svg>
);


function AdminPanel() {
  const [accessGranted, setAccessGranted] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false); // For the form input
  const [owners, setOwners] = useState([]);
  const [message, setMessage] = useState("");
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({}); // For table: { ownerId: true/false }


  const navigate = useNavigate();

  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll('.admin-animate-on-load');
    elementsToAnimate.forEach((el, index) => {
      const delay = parseInt(el.dataset.delay || "0", 10); // Get delay from data-delay
      setTimeout(() => {
        el.classList.add('is-visible');
      }, delay + index * 50); // Add stagger to existing delay
    });
  }, [accessGranted]); 

  const handleAccess = () => {
    if (secretKey === "Prajwal@2004") { 
      setAccessGranted(true);
      setMessage("");
    } else {
      setMessage("Incorrect secret key. Access denied.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleLogout = () => {
    setAccessGranted(false);
    setSecretKey("");
    setEmail("");
    setPassword("");
    setEditId(null);
    setMessage("");
    setShowPasswordInput(false);
    setVisiblePasswords({});
    navigate("/Login"); 
  };

  useEffect(() => {
    if (accessGranted) fetchOwners();
  }, [accessGranted]);

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("https://rentcare.onrender.com/users?role=owner");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch owners");
      }
      const data = await res.json();
      setOwners(data);
    } catch (error) {
      console.error("Fetch owners error:", error);
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOrUpdateOwner = async () => {
    if (!email || !password) {
      setMessage("Please fill all fields.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setIsLoading(true);
    const ownerData = { role: "owner", email, password };

    try {
      const url = editId ? `https://rentcare.onrender.com/users/${editId}` : "https://rentcare.onrender.com/users";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ownerData),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || `Failed to ${editId ? "update" : "add"} owner.`);
      }
      
      setMessage(`Owner ${editId ? "updated" : "added"} successfully!`);
      fetchOwners();
      setEmail("");
      setPassword("");
      setEditId(null);
      setShowPasswordInput(false);
      setTimeout(() => setMessage(""), 3000);

    } catch (error) {
      console.error("Save owner error:", error);
      setMessage(error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (owner) => {
    setEmail(owner.email);
    setPassword(owner.password); 
    setEditId(owner.id);
    setShowPasswordInput(false); // Reset visibility when editing
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this owner?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://rentcare.onrender.com/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete owner.");
      }
      setMessage("Owner deleted successfully.");
      fetchOwners(); 
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Delete owner error:", error);
      setMessage(error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOwnerPasswordVisibility = (ownerId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [ownerId]: !prev[ownerId]
    }));
  };

  if (!accessGranted) {
    return (
      <div className="admin-access-page-wrapper">
        <div className="admin-access-container admin-animate-on-load">
          <svg width="48" height="40" viewBox="0 0 36 30" className="admin-logo-icon" aria-hidden="true">
            <path d="M0 15 L14 0 L22 0 L8 15 Z" fill="#334155"/>
            <path d="M14 30 L28 15 L36 15 L22 30 Z" fill="#FF7F50"/>
          </svg>
          <h2 className="admin-access-heading">Admin Panel Access</h2>
          <p className="admin-access-subheading">Please enter the secret key to proceed.</p>
          <div className="input-group">
            <input
              className="admin-input"
              type="password"
              placeholder="Enter Secret Key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAccess()}
            />
          </div>
          <button className="admin-button primary" onClick={handleAccess}>
            Unlock Admin Panel
          </button>
          {message && <p className={`admin-message ${message.includes("denied") ? 'error' : 'info'}`}>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-page-wrapper">
      <div className="admin-container">
        <div className="admin-panel-header admin-animate-on-load">
          <h2 className="admin-main-heading">RentCare Admin</h2>
          <button className="admin-button logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <section className="admin-section owner-form-section admin-animate-on-load" data-delay="100">
          <h3 className="admin-section-heading">{editId ? "Edit Owner" : "Add New Owner"}</h3>
          <div className="admin-form">
            <div className="input-group">
              <label htmlFor="ownerEmail">Owner Email</label>
              <input
                id="ownerEmail"
                className="admin-input"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="input-group password-group">
              <label htmlFor="ownerPassword">Owner Password</label>
              <input
                id="ownerPassword"
                className="admin-input"
                type={showPasswordInput ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPasswordInput(!showPasswordInput)}
                aria-label={showPasswordInput ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                <EyeIcon Rendersolid={showPasswordInput} />
              </button>
            </div>
            <button className="admin-button primary" onClick={handleAddOrUpdateOwner} disabled={isLoading}>
              {isLoading ? <span className="spinner"></span> : (editId ? "Update Owner" : "Add Owner")}
            </button>
          </div>
          {message && <p className={`admin-message ${message.includes("successfully") ? 'success' : (message.includes("Failed") || message.includes("fill all fields") ? 'error' : 'info')}`}>{message}</p>}
        </section>

        <section className="admin-section owner-list-section admin-animate-on-load" data-delay="200">
          <h3 className="admin-section-heading">Current Owners</h3>
          {isLoading && owners.length === 0 && <p className="loading-text">Loading owners...</p>}
          {!isLoading && owners.length === 0 && <p className="no-data-text">No owners found. Add one above!</p>}
          {owners.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id}>
                      <td data-label="Email">{owner.email}</td>
                      <td data-label="Password" className="password-cell">
                        <span>
                          {visiblePasswords[owner.id] ? owner.password : "••••••••"}
                        </span>
                        <button 
                            type="button"
                            className="password-toggle-btn table-eye-icon"
                            onClick={() => toggleOwnerPasswordVisibility(owner.id)}
                            aria-label={visiblePasswords[owner.id] ? "Hide password" : "Show password"}
                        >
                            <EyeIcon Rendersolid={visiblePasswords[owner.id]} />
                        </button>
                      </td>
                      <td data-label="Actions">
                        <div className="action-buttons">
                          <button className="admin-button edit" onClick={() => handleEdit(owner)} disabled={isLoading}>Edit</button>
                          <button className="admin-button delete" onClick={() => handleDelete(owner.id)} disabled={isLoading}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminPanel;
