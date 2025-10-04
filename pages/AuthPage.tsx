import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from './LoadingPage';

const AuthPage: React.FC = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 space-y-8">
      <Logo />
      <AuthForm />
    </div>
  );
};

export default AuthPage;
