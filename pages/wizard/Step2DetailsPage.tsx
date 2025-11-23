import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { JobHistoryResponse, JobHistoryUpdate } from '../../types';
import { updateJobHistories, getAllJobHistories, getResumeText, processResume } from '../../services/api';
import type { ResumeProcessResponse } from '../../types';
import Layout from '../../components/Layout';
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
  const [isReprocessing, setIsReprocessing] = useState(false); // For resume reprocess flow
  const [summary, setSummary] = useState<string | null>(null);
  const [skills, setSkills] = useState<string | null>(null);
  // Collapsible preview sections
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);

  // Helper: apply default selections (first two) if none already chosen
  const applyDefaultSelections = (histories: JobHistoryResponse[]) => {
    if (histories.length <= 2) return histories;
    const alreadySelected = histories.filter(job => !!job.is_default_rewrite).length;
    if (alreadySelected > 0) return histories;
    return histories.map((job, index) =>
      index < 2 ? { ...job, is_default_rewrite: true } : job
    );
  };

  useEffect(() => {
    if (!session) return;

    const fetchJobHistories = async () => {
      setIsFetching(true);
      try {
        const resp = await getAllJobHistories(session.access_token);
        const data = resp.jobs || [];
        const withDefaults = applyDefaultSelections(data);
        setJobHistories(withDefaults);
        setOriginalJobHistories(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
        setSummary(resp.summary || null);
        setSkills(resp.skills || null);
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

  const handleReprocess = async () => {
    if (!session) return;
    setIsReprocessing(true);
    try {
      // Fetch stored resume text
      const resumeResp = await getResumeText(session.access_token);
      const raw = (resumeResp?.resume_text || '').trim();
      if (!raw) {
        addToast('No stored resume found. Please go back and upload.', 'error');
        navigate('/wizard/step-1');
        return;
      }

      // Re-run processing even if unchanged
      const resp: ResumeProcessResponse = await processResume(session.access_token, { resume_text: raw });
      const refreshed = resp.jobs || [];
      const withDefaults = applyDefaultSelections(refreshed);
      setJobHistories(withDefaults);
      setOriginalJobHistories(JSON.parse(JSON.stringify(refreshed))); // Keep original raw for comparison
      setSummary(resp.summary || null);
      setSkills(resp.skills || null);
      addToast('Resume reprocessed. Job histories refreshed.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to reprocess resume.', 'error');
    } finally {
      setIsReprocessing(false);
    }
  };

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
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="my-4">
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-slate-400">Loading your job history...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="my-6">
          <div className="flex items-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">Enhance Your Job History
              <span className="relative group inline-flex ml-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px] cursor-help">info</span>
                <span className="absolute left-1/2 -translate-x-1/2 mt-6 w-72 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-md p-3 opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg transition-opacity z-20">
                  Step 2 lets you enrich each role with optional context and pick which roles are defaults for tailoring. If a role was parsed incorrectly, you can try a quick reprocess without losing any added details.
                </span>
              </span>
            </h1>
          </div>
          <p className="text-slate-400 mt-1">Step 2 of 2: Add context and select defaults for tailoring.</p>
        </div>
        {/* New: Summary & Skills Preview (shown if available) */}
        {(summary || skills) && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 shadow flex flex-col">
                <button
                  type="button"
                  onClick={() => setSummaryOpen(o => !o)}
                  aria-expanded={summaryOpen}
                  className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-slate-750/50 transition-colors"
                >
                  <span className="text-lg font-semibold">Professional Summary</span>
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">{summaryOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {summaryOpen && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed styled-scrollbar overflow-auto max-h-60 pr-1">
                      {summary}
                    </p>
                  </div>
                )}
              </div>
            )}
            {skills && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 shadow flex flex-col">
                <button
                  type="button"
                  onClick={() => setSkillsOpen(o => !o)}
                  aria-expanded={skillsOpen}
                  className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-slate-750/50 transition-colors"
                >
                  <span className="text-lg font-semibold">Skills Extracted</span>
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">{skillsOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {skillsOpen && (
                  <div className="px-5 pb-5">
                    <div className="text-sm text-slate-200 leading-relaxed styled-scrollbar overflow-auto max-h-60 pr-1">
                      {(() => {
                        const raw = skills || '';
                        const parts = raw.includes('\n') ? raw.split(/\r?\n+/) : raw.split(/[,;]+/);
                        const cleaned = parts.map(p => p.trim()).filter(Boolean);
                        return cleaned.length > 1 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {cleaned.map((s, i) => <li key={`skill-${i}`}>{s}</li>)}
                          </ul>
                        ) : (
                          <p>{raw}</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        

        <div className="flex justify-end mb-8 space-x-4">
          <button
            onClick={handleBack}
            disabled={isLoading || isReprocessing}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <div className="relative group inline-flex">
            <button
              onClick={handleReprocess}
              disabled={isLoading || isReprocessing}
              className="px-6 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Reprocess resume to refresh roles"
            >
              {isReprocessing ? <LoadingSpinner size="sm" /> : 'Reprocess'}
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 mt-12 w-64 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-md p-3 opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg transition-opacity z-20">
              Rarely needed. Runs the extractor again on your stored resume text. Your added role details are preserved.
            </span>
          </div>
          <button
            onClick={handleFinish}
            disabled={isLoading || isReprocessing}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Save'}
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
                                className="styled-scrollbar w-full h-full min-h-[150px] p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                disabled={isReprocessing}
                            />
                        </div>
                    </div>
                </div>
              );
            })}
        </div>
      </div>
      {isReprocessing && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-40">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col items-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-300">Reprocessing resume...</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Step2DetailsPage;