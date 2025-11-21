
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { createApplication, startResumeCheck } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const { session } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      addToast('Please paste a job description.', 'error');
      return;
    }
    if (!session) return;

    setIsSubmitting(true);
    try {
      // Kick off both requests in parallel for efficiency
      const applicationPromise = createApplication(session.access_token, {
        target_job_description: jobDescription,
      });
      
      const checkPromise = startResumeCheck(session.access_token, {
        job_post: jobDescription,
      });

      // Wait for both to complete
      const [applicationResponse, checkResponse] = await Promise.all([applicationPromise, checkPromise]);

      addToast('Application started! We are now tailoring your resume.', 'success');
      navigate(`/application/${applicationResponse.id}`, {
        state: { 
          resumeCheckJobId: checkResponse.job_id,
          jobDescription: jobDescription,
        },
      });
    } catch (error: any) {
      addToast(error.message || 'Failed to start application.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Tailor Your Resume</h1>
        <p className="text-lg text-slate-400 mb-8">Paste a job description below to get started.</p>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
            <label htmlFor="job-description" className="block text-lg font-medium text-slate-300 mb-2">
              Job Description
            </label>
            <textarea
              id="job-description"
              rows={12}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSubmitting) {
                    formRef.current?.requestSubmit();
                  }
                }
              }}
              placeholder="Paste the full job description here..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            <p className="mt-2 text-sm text-slate-500">Press Enter to submit. Use Shift+Enter for a new line.</p>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-slate-900 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Customize My Resume'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default DashboardPage;
