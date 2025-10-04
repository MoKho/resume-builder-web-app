
import React, { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import Step1ResumePage from './pages/wizard/Step1ResumePage';
import Step2DetailsPage from './pages/wizard/Step2DetailsPage';
import ApplicationStatusPage from './pages/ApplicationStatusPage';
import ResultsPage from './pages/ResultsPage';
import LoadingPage from './pages/LoadingPage';

const API_BASE_URL = 'https://resume-api-backend.onrender.com';

function App() {
  useEffect(() => {
    const keepAlive = () => {
      // This fetch request is to keep the free Render backend instance from sleeping.
      console.log('Keep Alive')
      fetch(`${API_BASE_URL}/`).catch(err => {
        // We can silently fail here. The main app functionality will handle API errors when it matters.
        console.error('Keep-alive ping failed:', err);
      });
    };
    
    // Ping immediately on load, then every 48 seconds.
    keepAlive();
    const intervalId = setInterval(keepAlive, 48000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wizard/step-1"
              element={
                <ProtectedRoute>
                  <Step1ResumePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wizard/step-2"
              element={
                <ProtectedRoute>
                  <Step2DetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/application/:id"
              element={
                <ProtectedRoute>
                  <ApplicationStatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:id"
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              }
            />
             <Route path="/loading" element={<LoadingPage />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
