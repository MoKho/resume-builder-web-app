import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { JobHistoryResponse, JobHistoryUpdate } from '../../types';
import { updateJobHistories, getAllJobHistories } from '../../services/api';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';

const parseAchievementLines = (achievements?: string | null) =>
  (achievements || '')
    .split(/\r?\n+/)
    .map(line => line.replace(/^[-•\u2022]+\s*/, '').trim())
    .filter(Boolean);

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

    const applyDefaultSelections = (histories: JobHistoryResponse[]) => {
      if (histories.length <= 2) return histories;
      const alreadySelected = histories.filter(job => !!job.is_default_rewrite).length;
      if (alreadySelected > 0) return histories;
      return histories.map((job, index) =>
        index < 2 ? { ...job, is_default_rewrite: true } : job
      );
    };

    const fetchJobHistories = async () => {
      setIsFetching(true);
      try {
        const data = await getAllJobHistories(session.access_token);
        const withDefaults = applyDefaultSelections(data);
        setJobHistories(withDefaults);
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
            <p className="text-slate-500 mt-4 max-w-3xl mx-auto">
              Providing extra context, such as project details, specific metrics, or team dynamics, helps our AI understand the full scope of your achievements. This rich detail allows for a more impactful and accurately tailored resume.
            </p>
        </div>

        <div className="flex justify-end mb-8 space-x-4">
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

        <div className="space-y-6">
          {jobHistories.map(job => {
            const achievementLines = parseAchievementLines(job.achievements);
            return (
            <div key={job.id} className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    {/* Row 1: Title, Company, and Checkbox */}
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-100">{job.job_title}</h3>
                            <p className="text-md text-slate-400">{job.company_name}</p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
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

                    {/* Row 2: Achievements and Textarea */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Achievements (read-only textarea preserving line breaks) */}
            <div>
                  <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700 h-full flex flex-col">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Key Achievements from Resume:</h4>
                <div className="styled-scrollbar flex-1 overflow-auto pr-1">
                      {achievementLines.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-slate-200 text-sm leading-relaxed">
                          {achievementLines.map((line, idx) => (
                            <li key={`${job.id}-achievement-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No achievements captured for this role.</p>
                      )}
                    </div>
                  </div>
            </div>
                        {/* Right side: Textarea */}
                        <div>
                            <textarea
                                value={job.detailed_background || ''}
                                onChange={e => handleInputChange(job.id, 'detailed_background', e.target.value)}
                                placeholder="[Optional] Add more details, achievements, or context about this role. This greatly helps tailor your resume."
                                rows={6}
                                className="styled-scrollbar w-full h-full min-h-[150px] p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Step2DetailsPage;