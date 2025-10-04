
import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from './LoadingPage';

const HomePage: React.FC = () => {
  const { session, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingPage />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Session exists, but profile is still loading
  if (!profile) {
    return <LoadingPage />;
  }

  if (profile.has_base_resume) {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/wizard/step-1" replace />;
  }
};

export default HomePage;
