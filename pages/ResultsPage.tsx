
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication, startResumeCheck, getResumeCheckResult } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { addToast } = useToast();

  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tailoredResumeHtml, setTailoredResumeHtml] = useState('');
  const [initialAnalysisHtml, setInitialAnalysisHtml] = useState('');
  const [newAnalysisHtml, setNewAnalysisHtml] = useState('');

  const [isLoadingNewAnalysis, setIsLoadingNewAnalysis] = useState(true);
  const analysisIntervalRef = useRef<number | null>(null);

  const parseMarkdown = async (markdown: string | null): Promise<string> => {
    if (!markdown || typeof markdown !== 'string') return '';
    try {
      const rawHtml = await marked.parse(markdown, { async: true, gfm: true, breaks: true });
      return DOMPurify.sanitize(rawHtml);
    } catch (e) {
      console.error("Error parsing markdown", e);
      const pre = document.createElement('pre');
      pre.textContent = markdown;
      return pre.outerHTML;
    }
  };

  useEffect(() => {
    const applicationId = Number(id);
    if (isNaN(applicationId) || !session) {
        navigate('/dashboard');
        return;
    };

    const processInitialAnalysis = async () => {
      const markdown = location.state?.initialAnalysis;
      if (markdown) {
        setInitialAnalysisHtml(await parseMarkdown(markdown));
      }
    };
    processInitialAnalysis();

    const fetchAllData = async () => {
      try {
        const appData = await getApplication(session.access_token, applicationId);
        setApplication(appData);

        if (appData?.final_resume_text) {
          setTailoredResumeHtml(await parseMarkdown(appData.final_resume_text));
        }

        const jobDescription = location.state?.jobDescription;
        if (appData?.final_resume_text && jobDescription) {
          const checkJob = await startResumeCheck(session.access_token, {
            job_post: jobDescription,
            resume_text: appData.final_resume_text,
          });

          const pollNewAnalysis = async () => {
              const result = await getResumeCheckResult(session.access_token, checkJob.job_id);
              if (result.status === 'completed') {
                if(analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
                setNewAnalysisHtml(await parseMarkdown(result.analysis));
                setIsLoadingNewAnalysis(false);
              } else if (result.status === 'failed') {
                if(analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
                addToast('Could not load tailored resume analysis.', 'error');
                setNewAnalysisHtml('<p>Error loading analysis.</p>');
                setIsLoadingNewAnalysis(false);
              }
          };
          pollNewAnalysis();
          analysisIntervalRef.current = window.setInterval(pollNewAnalysis, 3000);

        } else {
          setIsLoadingNewAnalysis(false);
          setNewAnalysisHtml('<p>Analysis could not be performed due to missing data.</p>');
        }
      } catch (error: any) {
        addToast(error.message || 'Failed to load results.', 'error');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
    
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  const handleCopy = () => {
    if (application?.final_resume_text) {
      navigator.clipboard.writeText(application.final_resume_text);
      addToast('Resume copied to clipboard!', 'success');
    }
  };

  const handleStartOver = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
        <Layout>
            <div className="flex justify-center items-center h-96">
                <LoadingSpinner size="lg"/>
            </div>
        </Layout>
    );
  }

  if (!application) {
    return (
        <Layout>
            <div className="text-center">
                <h1 className="text-2xl font-bold">Application not found.</h1>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Your Tailored Resume</h1>
        <p className="text-lg text-slate-400 mb-6">Here is your AI-powered resume, customized for the job description.</p>

        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <div
            className="styled-scrollbar prose prose-sm sm:prose-base prose-invert max-w-none text-slate-300 leading-relaxed overflow-auto max-h-[60vh] prose-headings:text-slate-100 prose-a:text-teal-400 hover:prose-a:text-teal-300 prose-strong:text-slate-100 prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-teal-400"
            dangerouslySetInnerHTML={{ __html: tailoredResumeHtml }}
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors"
          >
            Copy Resume Text
          </button>
          <button
            onClick={handleStartOver}
            className="flex-1 py-3 px-4 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 transition-colors"
          >
            Start a New Application
          </button>
        </div>

        <div className="mt-12 border-t border-slate-700 pt-8">
            <h2 className="text-3xl font-bold text-center text-slate-100 mb-8">Resume Analysis Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-3 text-center">Original Resume Analysis</h3>
                    <div className="bg-slate-800 p-4 rounded-lg shadow-inner h-96">
                        {initialAnalysisHtml ? (
                            <div
                                className="styled-scrollbar prose prose-sm prose-invert max-w-none text-slate-300 h-full overflow-auto prose-headings:text-slate-200 prose-a:text-teal-400"
                                dangerouslySetInnerHTML={{ __html: initialAnalysisHtml }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>Original analysis not available.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-3 text-center">Tailored Resume Analysis</h3>
                    <div className="bg-slate-800 p-4 rounded-lg shadow-inner h-96">
                        {isLoadingNewAnalysis ? (
                            <div className="flex items-center justify-center h-full">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div
                                className="styled-scrollbar prose prose-sm prose-invert max-w-none text-slate-300 h-full overflow-auto prose-headings:text-slate-200 prose-a:text-teal-400"
                                dangerouslySetInnerHTML={{ __html: newAnalysisHtml }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </Layout>
  );
};

export default ResultsPage;
