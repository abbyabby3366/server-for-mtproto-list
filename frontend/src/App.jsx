import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Analytics from './pages/Analytics';
import UserLoginDetails from './pages/UserLoginDetails';
import NetworkUsage from './pages/NetworkUsage';
import TalkProUsers from './pages/TalkProUsers';
import XrayStats from './pages/XrayStats';
import Configs from './pages/Configs';
import Users from './pages/Users';
import TrafficReport from './pages/TrafficReport';
import SpeedControl from './pages/SpeedControl';

// A wrapper component for protecting routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route wrapper specifically for Login page to redirect to dashboard if already authenticated
const LoginRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/analytics" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route 
        path="/login" 
        element={
          <LoginRoute>
            <Login />
          </LoginRoute>
        } 
      />

      {/* Protected Routes wrapped in Layout */}
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/logins" 
        element={
          <ProtectedRoute>
            <UserLoginDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/network" 
        element={
          <ProtectedRoute>
            <NetworkUsage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/talkpro-users" 
        element={
          <ProtectedRoute>
            <TalkProUsers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/speed-control" 
        element={
          <ProtectedRoute>
            <SpeedControl />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/traffic-report" 
        element={
          <ProtectedRoute>
            <TrafficReport />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/xray" 
        element={
          <ProtectedRoute>
            <XrayStats />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/configs" 
        element={
          <ProtectedRoute>
            <Configs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        } 
      />

      {/* Wildcard Fallbacks */}
      <Route path="/" element={<Navigate to="/analytics" replace />} />
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Routes>
  );
}

export default App;
