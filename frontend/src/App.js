import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CloudProvider } from './context/CloudContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/dashboard/Dashboard';
import PrivateRoute from './components/shared/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CloudProvider>
          <NotificationProvider>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </NotificationProvider>
        </CloudProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;