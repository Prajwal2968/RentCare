// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import OwnerDashboard from './OwnerDashboard';
import OwnerViewTenants from './OwnerViewTenants';
import OwnerMaintenanceRequests from './OwnerMaintenanceRequests';
import AdminPanel from './AdminPanel';
import Login from './Login';
import TenantDashboard from './TenantDashboard';
import PaymentSuccess from './components/PaymentSuccess';
import NotFound from './NotFound'; // Import NotFound component

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ownerviewtenants" element={<OwnerViewTenants />} />
        <Route path="/owner/maintenance" element={<OwnerMaintenanceRequests />} />
        <Route path="/Admin" element={<AdminPanel />} />
        <Route path="/OwnerDashboard/:ownerId" element={<OwnerDashboard />} />
        <Route path="/TenantDashboard/:propertyId/:flatNo" element={<TenantDashboard />} />
        <Route path="/payment-success/:flatNo/:propertyId" element={<PaymentSuccess />} />
        <Route path="*" element={<NotFound />} /> {/* Catch-all route at the end */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;