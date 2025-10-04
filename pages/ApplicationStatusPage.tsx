
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';

const loadingMessages = [
  "Analyzing job description...",
  "Matching your skills and experience...",
  "Rewriting your achievements for maximum impact...",
  "Writing a professional summary...",
  "Crafting a compelling narrative...",
  "Finalizing your tailored resume...",
  "Almost there, just polishing the details..."
];

const ApplicationStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState<ApplicationResponse['status'] | 'loading'>('loading');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const applicationId = Number(id);
    if (isNaN(applicationId) || !session) {
      addToast('Invalid application ID or session.', 'error');
      navigate('/dashboard');
      return;
    }
    
    const pollStatus = async () => {
      try {
        const response = await getApplication(session.access_token, applicationId);
        setStatus(response.status);
        if (response.status === 'completed') {
          if(intervalRef.current) clearInterval(intervalRef.current);
          addToast('Your tailored resume is ready!', 'success');
          navigate(`/results/${applicationId}`);
        } else if (response.status === 'failed') {
          if(intervalRef.current) clearInterval(intervalRef.current);
          addToast('Something went wrong while tailoring your resume.', 'error');
          navigate('/dashboard');
        }
      } catch (error: any) {
        if(intervalRef.current) clearInterval(intervalRef.current);
        addToast(error.message || 'Failed to check application status.', 'error');
        navigate('/dashboard');
      }
    };
    
    pollStatus(); // Initial check
    intervalRef.current = window.setInterval(pollStatus, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, navigate, addToast]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-center p-4">
      <Logo />
      <div className="mt-8">
          <LoadingSpinner size="lg" />
      </div>
      <h1 className="text-3xl font-bold text-slate-100 mt-8">Tailoring in Progress</h1>
      <p className="text-slate-400 mt-2 text-lg transition-opacity duration-500">
        {loadingMessages[currentMessageIndex]}
      </p>
    </div>
  );
};

export default ApplicationStatusPage;
