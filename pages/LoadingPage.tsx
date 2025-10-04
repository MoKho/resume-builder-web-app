
import React from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';

const LoadingPage: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 space-y-6">
        <Logo />
        <LoadingSpinner size="lg" />
        <p className="text-slate-400">Loading your space...</p>
    </div>
  );
};

export default LoadingPage;
