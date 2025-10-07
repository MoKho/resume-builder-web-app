
import React from 'react';
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

function App() {
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