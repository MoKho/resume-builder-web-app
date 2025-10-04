import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToast } = useToast();
  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      const applicationId = Number(id);
      if (isNaN(applicationId) || !session) return;
      
      try {
        const data = await getApplication(session.access_token, applicationId);
        setApplication(data);
        if (data?.final_resume_text) {
          const rawHtml = await marked.parse(data.final_resume_text, { async: true, gfm: true, breaks: true });
          setHtmlContent(DOMPurify.sanitize(rawHtml));
        }
      } catch (error: any) {
        addToast(error.message || 'Failed to load results.', 'error');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
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
            dangerouslySetInnerHTML={{ __html: htmlContent }}
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
      </div>
    </Layout>
  );
};

export default ResultsPage;
