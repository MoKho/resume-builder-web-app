import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication, getResumeCheckResult } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import ScoreDisplay from '../components/ScoreDisplay';

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

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [initialScore, setInitialScore] = useState<number | null>(null);
  const [initialRawScoreCsv, setInitialRawScoreCsv] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const initialAnalysisRef = useRef<string | null>(null);
  const appStatusIntervalRef = useRef<number | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);
  const messageIntervalRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Simulated progress bar: random increments, roughly 16 seconds to reach ~80%
  useEffect(() => {
    const tickMs = 400;
    const maxBeforeCompletion = 80;
    const randomIncrement = () => 1 + Math.random() * 2; // 1-3% bumps keep pace but feel organic

    const updateProgress = () => {
      setProgress(prev => {
        if (prev >= maxBeforeCompletion) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return prev;
        }
        const next = Math.min(maxBeforeCompletion, prev + randomIncrement());
        return next;
      });
    };

    updateProgress();
    progressIntervalRef.current = window.setInterval(updateProgress, tickMs);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Poll for resume check analysis
  useEffect(() => {
    const resumeCheckJobId = location.state?.resumeCheckJobId;
    if (!resumeCheckJobId || !session) {
        setIsAnalysisLoading(false);
        return;
    };

    const pollAnalysis = async () => {
      try {
        const response = await getResumeCheckResult(session.access_token, resumeCheckJobId);
        if (response.status === 'completed') {
          if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
          if (response.analysis) {
            initialAnalysisRef.current = response.analysis;
            const rawHtml = await marked.parse(response.analysis, { async: true, gfm: true, breaks: true });
            setAnalysisHtml(DOMPurify.sanitize(rawHtml));
          }
          setInitialScore(response.score);
          setInitialRawScoreCsv(response.raw_score_csv);
          setIsAnalysisLoading(false);
        } else if (response.status === 'failed') {
          if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
          addToast('Failed to analyze initial resume.', 'error');
          setIsAnalysisLoading(false);
        }
      } catch (error: any) {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
        addToast(error.message || 'Failed to get resume analysis status.', 'error');
        setIsAnalysisLoading(false);
      }
    };

    pollAnalysis();
    analysisIntervalRef.current = window.setInterval(pollAnalysis, 3000);

    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [location.state?.resumeCheckJobId, session, addToast]);

  // Poll for application status
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
        if (response.status === 'completed') {
          if (appStatusIntervalRef.current) clearInterval(appStatusIntervalRef.current);
          if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
          setProgress(100);
          addToast('Your tailored resume is ready!', 'success');
          navigate(`/results/${applicationId}`, {
            state: {
                resumeCheckJobId: location.state?.resumeCheckJobId,
                initialAnalysis: initialAnalysisRef.current,
                initialScore: initialScore,
                initialRawScoreCsv: initialRawScoreCsv,
                jobDescription: location.state?.jobDescription,
            }
          });
        } else if (response.status === 'failed') {
          if (appStatusIntervalRef.current) clearInterval(appStatusIntervalRef.current);
          if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
          setProgress(100);
          addToast('Something went wrong while tailoring your resume.', 'error');
          navigate('/dashboard');
        }
      } catch (error: any) {
        if (appStatusIntervalRef.current) clearInterval(appStatusIntervalRef.current);
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        setProgress(100);
        addToast(error.message || 'Failed to check application status.', 'error');
        navigate('/dashboard');
      }
    };
    
    pollStatus();
    appStatusIntervalRef.current = window.setInterval(pollStatus, 4000);
    messageIntervalRef.current = window.setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
    }, 5000);


    return () => {
      if (appStatusIntervalRef.current) clearInterval(appStatusIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [id, session, navigate, addToast, location.state?.jobDescription, initialScore, initialRawScoreCsv]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-slate-100 p-4">
        <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center">
             <div className="flex items-center justify-center space-x-3 p-3 mb-6 bg-slate-800/50 rounded-lg">
                <LoadingSpinner size="sm" />
                <div className="text-left">
                    <h2 className="text-xl font-bold text-slate-100">Tailoring in Progress...</h2>
                    <p className="text-slate-400 mt-1 text-base transition-opacity duration-500">
                        {loadingMessages[currentMessageIndex]}
                    </p>
                </div>
            </div>
            <div className="mb-8">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            <div className="text-left mb-6">
                <h1 className="text-3xl font-bold text-slate-100">Initial Resume Analysis</h1>
                <p className="text-slate-400">Here's how your current resume stacks up against the job description.</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-left min-h-[300px] flex flex-col">
              {isAnalysisLoading ? (
                <div className="flex-grow flex flex-col justify-center items-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-slate-400">Analyzing your resume...</p>
                </div>
              ) : (
                <>
                  <ScoreDisplay label="Match Score" score={initialScore} rawCsv={initialRawScoreCsv} />
                  {analysisHtml ? (
                    <div
                      className="analysis-content styled-scrollbar prose prose-sm sm:prose-base prose-invert max-w-none text-slate-300 leading-relaxed overflow-auto flex-grow"
                      dangerouslySetInnerHTML={{ __html: analysisHtml }}
                    />
                  ) : (
                    <div className="flex-grow flex flex-col justify-center items-center text-slate-400">
                        <p>Could not load resume analysis.</p>
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
    </div>
  );
};

export default ApplicationStatusPage;