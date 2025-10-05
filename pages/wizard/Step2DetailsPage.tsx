import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { JobHistoryResponse, JobHistoryUpdate } from '../../types';
import { updateJobHistories, getAllJobHistories } from '../../services/api';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';

const Step2DetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { addToast } = useToast();

  const [jobHistories, setJobHistories] = useState<JobHistoryResponse[]>([]);
  const [originalJobHistories, setOriginalJobHistories] = useState<JobHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For submit button
  const [isFetching, setIsFetching] = useState(true); // For initial page load

  useEffect(() => {
    if (!session) return;

    const fetchJobHistories = async () => {
      setIsFetching(true);
      try {
        const data = await getAllJobHistories(session.access_token);
        setJobHistories(data);
        setOriginalJobHistories(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
      } catch (error: any) {
        addToast(error.message || 'Failed to fetch job history.', 'error');
        navigate('/wizard/step-1');
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchJobHistories();
  }, [session, navigate, addToast]);

  const handleInputChange = (id: number, field: 'detailed_background' | 'is_default_rewrite', value: string | boolean) => {
    setJobHistories(prev =>
      prev.map(job => (job.id === id ? { ...job, [field]: value } : job))
    );
  };
  
  const handleBack = () => navigate('/wizard/step-1');

  const handleFinish = async () => {
    if (!session) return;

    const updates: JobHistoryUpdate[] = jobHistories
      .filter(currentJob => {
        const originalJob = originalJobHistories.find(oj => oj.id === currentJob.id);
        if (!originalJob) return false;
        // Compare the fields that can be changed
        return (
          (currentJob.detailed_background || '') !== (originalJob.detailed_background || '') ||
          !!currentJob.is_default_rewrite !== !!originalJob.is_default_rewrite
        );
      })
      .map(job => ({
        id: job.id,
        detailed_background: job.detailed_background,
        is_default_rewrite: job.is_default_rewrite,
      }));

    if (updates.length === 0) {
      addToast('No changes detected.', 'info');
      navigate('/dashboard');
      return;
    }

    setIsLoading(true);
    try {
      await updateJobHistories(session.access_token, updates);
      addToast('Profile updated successfully!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      addToast(error.message || 'Failed to update job history.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Logo />
        <div className="my-8">
          <LoadingSpinner size="lg" />
        </div>
        <p className="text-slate-400">Loading your job history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center my-8">
            <Logo />
            <h1 className="text-3xl font-bold mt-4">Enhance Your Job History</h1>
            <p className="text-slate-400 mt-2">Step 2 of 2: Add details and select defaults for tailoring.</p>
        </div>

        <div className="space-y-4">
            {jobHistories.map(job => (
                <div key={job.id} className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-100">{job.job_title}</h3>
                            <p className="text-md text-slate-400">{job.company_name}</p>
                        </div>
                        <div className="flex items-center">
                            <input
                                id={`default-${job.id}`}
                                type="checkbox"
                                checked={!!job.is_default_rewrite}
                                onChange={e => handleInputChange(job.id, 'is_default_rewrite', e.target.checked)}
                                className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <label htmlFor={`default-${job.id}`} className="ml-2 text-sm text-slate-300">Default for tailoring</label>
                        </div>
                    </div>
                    <textarea
                        value={job.detailed_background || ''}
                        onChange={e => handleInputChange(job.id, 'detailed_background', e.target.value)}
                        placeholder="Add more details, achievements, or context about this role..."
                        rows={4}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            ))}
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinish}
            disabled={isLoading}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Save and Finish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step2DetailsPage;