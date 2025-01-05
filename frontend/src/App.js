import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import './i18n';
import Layout from './components/Layout';
import Login from './components/Login';
import Order from './components/Order';
import Overview from './components/Overview';
import Delivery from './components/Delivery';
import Balance from './components/Balance';
import Users from './components/Users';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/order" />} />
            <Route path="order" element={<Order />} />
            <Route path="overview" element={<Overview />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="balance" element={<Balance />} />
            <Route path="users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
