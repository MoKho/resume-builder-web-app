
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import { marked } from 'marked';
import DOMPurify from 'dompurify';


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
  const location = useLocation();
  const [status, setStatus] = useState<ApplicationResponse['status'] | 'loading'>('loading');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const processAnalysis = async () => {
      const analysisMarkdown = location.state?.analysis;
      if (analysisMarkdown && typeof analysisMarkdown === 'string') {
        try {
            const rawHtml = await marked.parse(analysisMarkdown, { async: true, gfm: true, breaks: true });
            setAnalysisHtml(DOMPurify.sanitize(rawHtml));
        } catch(e) {
            console.error("Error parsing markdown", e);
            const pre = document.createElement('pre');
            pre.textContent = analysisMarkdown;
            setAnalysisHtml(pre.outerHTML);
        }
      }
    };
    processAnalysis();
  }, [location.state]);


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
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-slate-100 p-4">
      {analysisHtml ? (
        <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center">
            <div className="text-left mb-6">
                <h1 className="text-3xl font-bold text-slate-100">Resume Analysis</h1>
                <p className="text-slate-400">Here's a preliminary analysis of your resume against the job description.</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-left mb-8">
              <div
                className="styled-scrollbar prose prose-sm sm:prose-base prose-invert max-w-none text-slate-300 leading-relaxed overflow-auto max-h-[50vh] prose-headings:text-slate-100 prose-a:text-teal-400 hover:prose-a:text-teal-300 prose-strong:text-slate-100 prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-teal-400"
                dangerouslySetInnerHTML={{ __html: analysisHtml }}
              />
            </div>
            <div className="flex items-center justify-center space-x-4 p-4 bg-slate-800/50 rounded-lg">
                <LoadingSpinner size="md" />
                <div className="text-left">
                    <h2 className="text-2xl font-bold text-slate-100">Tailoring in Progress...</h2>
                    <p className="text-slate-400 mt-1 text-lg transition-opacity duration-500">
                        {loadingMessages[currentMessageIndex]}
                    </p>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center">
          <Logo />
          <div className="mt-8">
              <LoadingSpinner size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mt-8">Tailoring in Progress</h1>
          <p className="text-slate-400 mt-2 text-lg transition-opacity duration-500">
            {loadingMessages[currentMessageIndex]}
          </p>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatusPage;
