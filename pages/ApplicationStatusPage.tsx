import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication, getResumeCheckResult } from '../services/api';
import type { ApplicationResponse } from '../types';
import Layout from '../components/Layout';
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

const AnalysisSkeleton = () => (
  <div className="animate-pulse space-y-8">
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="w-32 h-32 rounded-full bg-slate-700/50 flex-shrink-0" />
      <div className="flex-1 space-y-3 w-full">
        <div className="h-6 bg-slate-700/50 rounded w-1/3" />
        <div className="h-4 bg-slate-700/50 rounded w-full" />
        <div className="h-4 bg-slate-700/50 rounded w-5/6" />
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-700/50 rounded w-full" />
      <div className="h-4 bg-slate-700/50 rounded w-11/12" />
      <div className="h-4 bg-slate-700/50 rounded w-4/5" />
    </div>
  </div>
);

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
    <Layout>
      <div className="max-w-3xl mx-auto py-8 md:py-12 space-y-12">
        {/* Progress Section */}
        <div className="space-y-6 text-center max-w-2xl mx-auto">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-400">
              Tailoring Your Resume
            </h1>
            <p className="text-lg text-slate-400 h-8 flex items-center justify-center transition-all duration-500">
              {loadingMessages[currentMessageIndex]}
            </p>
          </div>

          <div className="relative pt-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider mt-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
          <div className="mb-8 border-b border-slate-700/50 pb-4">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-3">
              Initial Resume Analysis
              {isAnalysisLoading && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
              )}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Here's how your current resume stacks up against the job description.
            </p>
          </div>

          <div className="min-h-[200px]">
            {isAnalysisLoading ? (
              <AnalysisSkeleton />
            ) : (
              <div className="animate-fade-in">
                <ScoreDisplay label="Match Score" score={initialScore} rawCsv={initialRawScoreCsv} />
                {analysisHtml ? (
                  <div
                    className="mt-8 analysis-content styled-scrollbar prose prose-sm sm:prose-base prose-invert max-w-none text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: analysisHtml }}
                  />
                ) : (
                  <div className="flex flex-col justify-center items-center text-slate-400 py-12">
                    <p>Could not load resume analysis.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationStatusPage;