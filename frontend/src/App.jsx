import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

import Search from './pages/Search';
import Register from './pages/Register';
import Stolen from './pages/Stolen';
import Maintenance from './pages/Maintenance';
import Accidents from './pages/Accidents';
import Reports from './pages/Reports';
import Audit from './pages/Audit';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Search />} />
            <Route path="register" element={
              <ProtectedRoute allowedRoles={['admin', 'registrar']}>
                <Register />
              </ProtectedRoute>
            } />
            <Route path="stolen" element={<Stolen />} />
            <Route path="maintenance" element={
              <ProtectedRoute allowedRoles={['admin', 'to_employee', 'analyst', 'inspector', 'registrar']}>
                <Maintenance />
              </ProtectedRoute>
            } />
            <Route path="accidents" element={<Accidents />} />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['admin', 'analyst']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Audit />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
