import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApplication, startResumeCheck, getResumeCheckResult, API_BASE_URL } from '../services/api';
import type { ApplicationResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import ScoreDisplay from '../components/ScoreDisplay';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { addToast } = useToast();

  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tailoredResumeHtml, setTailoredResumeHtml] = useState('');
  const [newAnalysisHtml, setNewAnalysisHtml] = useState('');
  
  const [initialScore, setInitialScore] = useState<number | null>(null);
  const [initialRawScoreCsv, setInitialRawScoreCsv] = useState<string | null>(null);
  const [newScore, setNewScore] = useState<number | null>(null);
  const [newRawScoreCsv, setNewRawScoreCsv] = useState<string | null>(null);

  const [isLoadingNewAnalysis, setIsLoadingNewAnalysis] = useState(true);
  const analysisIntervalRef = useRef<number | null>(null);
  const analysisStartedRef = useRef(false); // Ref to track if analysis has been initiated
  const saveAsContainerRef = useRef<HTMLDivElement | null>(null); // For closing menu on outside click

  // Export (download) states
  const [exportReady, setExportReady] = useState(false); // readiness based on HEAD /export (using pdf)
  // Track which download is in progress and who initiated it (to control spinners independently)
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);
  const [downloadSource, setDownloadSource] = useState<'pdfButton' | 'saveAs' | null>(null);
  const [isSelectingFormat, setIsSelectingFormat] = useState(false);

  const checkExportAvailable = async (applicationId: number, token: string): Promise<boolean> => {
    try {
      // Using pdf for readiness check as per backend guidance
      const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/export?format=${encodeURIComponent('pdf')}`, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status === 204;
    } catch (e) {
      return false;
    }
  };

  type ExportFormat = 'pdf' | 'docx' | 'odt' | 'rtf' | 'txt' | 'html' | 'epub' | 'md';

  const EXPORT_FORMATS: { key: ExportFormat; label: string; ext: string }[] = [
    { key: 'pdf', label: 'PDF (.pdf)', ext: '.pdf' },
    { key: 'docx', label: 'Word (.docx)', ext: '.docx' },
    { key: 'odt', label: 'OpenDocument (.odt)', ext: '.odt' },
    { key: 'rtf', label: 'Rich Text (.rtf)', ext: '.rtf' },
    { key: 'txt', label: 'Text (.txt)', ext: '.txt' },
    { key: 'html', label: 'Web Page (.zip)', ext: '.zip' },
    { key: 'epub', label: 'EPUB (.epub)', ext: '.epub' },
  { key: 'md', label: 'Markdown (.md)', ext: '.md' },
  ];

  const handleDownloadExport = async (format: ExportFormat, source: 'pdfButton' | 'saveAs' = 'saveAs') => {
    if (!session || !application) return;
    setIsSelectingFormat(false);
    setDownloadingFormat(format);
    setDownloadSource(source);
    try {
      const urlWithParams = `${API_BASE_URL}/applications/${application.id}/export?format=${encodeURIComponent(format)}`;
      const res = await fetch(urlWithParams, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Download failed: ${res.status} ${msg}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Try to read filename from Content-Disposition if CORS exposes it
      const contentDisposition = res.headers.get('content-disposition') || res.headers.get('Content-Disposition') || '';
      let filename: string | null = null;

      const parseContentDispositionFilename = (cd: string): string | null => {
        if (!cd) return null;
        // RFC 5987 filename*
        const starMatch = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
        if (starMatch && starMatch[1]) {
          const raw = starMatch[1].trim().replace(/^\"|\"$/g, '');
          try { return decodeURIComponent(raw); } catch { return raw; }
        }
        // Regular filename="..." or filename=...
        const fnMatch = cd.match(/filename=(?:\"([^\"]+)\"|([^;]+))/i);
        if (fnMatch) {
          const raw = (fnMatch[1] || fnMatch[2] || '').trim().replace(/^\"|\"$/g, '');
          return raw || null;
        }
        return null;
      };

      filename = parseContentDispositionFilename(contentDisposition);

      if (!filename) {
        filename = `Tailored Resume - ${application.id}${EXPORT_FORMATS.find(f => f.key === format)?.ext || ''}`;
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Download started.', 'success');
      // Notify other parts of the app that a resume download occurred
      try {
        window.dispatchEvent(new CustomEvent('resume:downloaded', { detail: { format } }));
      } catch (e) {
        // ignore
      }
    } catch (error: any) {
      addToast(error.message || 'Could not download.', 'error');
    } finally {
      setDownloadingFormat(null);
      setDownloadSource(null);
    }
  };

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

    const processInitialData = async () => {
      const { initialScore, initialRawScoreCsv } = location.state || {};
      setInitialScore(initialScore ?? null);
      setInitialRawScoreCsv(initialRawScoreCsv ?? null);
    };
    processInitialData();

    const fetchAllData = async () => {
      try {
        const appData = await getApplication(session.access_token, applicationId);
        setApplication(appData);

        // If application is completed, check if export is ready (HEAD using pdf)
        if (appData?.status === 'completed') {
          const available = await checkExportAvailable(applicationId, session.access_token);
          setExportReady(available);
        } else {
          setExportReady(false);
        }

        if (appData?.final_resume_text) {
          setTailoredResumeHtml(await parseMarkdown(appData.final_resume_text));
        }

        const jobDescription = location.state?.jobDescription;
        if (appData?.final_resume_text && jobDescription && !analysisStartedRef.current) {
          analysisStartedRef.current = true; // Prevent this block from running again on re-renders
          
          const checkJob = await startResumeCheck(session.access_token, {
            job_post: jobDescription,
            resume_text: appData.final_resume_text,
          });

          const pollNewAnalysis = async () => {
              const result = await getResumeCheckResult(session.access_token, checkJob.job_id);
              if (result.status === 'completed') {
                if(analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
                setNewAnalysisHtml(await parseMarkdown(result.analysis));
                setNewScore(result.score);
                setNewRawScoreCsv(result.raw_score_csv);
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

        } else if (!appData?.final_resume_text || !jobDescription) {
           // This case handles when analysis can't be started due to missing data.
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
    
    // Silent HEAD /export readiness probe: try up to 10 times, every 1s
    let headTimer: number | null = null;
    let attempts = 0;
    const tryHead = async () => {
      if (!session) return;
      try {
        const available = await checkExportAvailable(applicationId, session.access_token);
        if (available) {
          setExportReady(true);
          return;
        }
      } catch (e) {
        // ignore
      }
      attempts += 1;
      if (attempts < 10) {
        headTimer = window.setTimeout(tryHead, 1000);
      }
    };
    tryHead();
    
    // Poll application status until completed to enable export when ready
    let statusTimer: number | null = null;
    const pollStatus = async () => {
      try {
        const app = await getApplication(session.access_token, applicationId);
        setApplication(app);
        if (app.status === 'completed') {
          const available = await checkExportAvailable(applicationId, session.access_token);
          setExportReady(available);
          if (statusTimer) window.clearTimeout(statusTimer);
          return;
        } else if (app.status === 'failed') {
          setExportReady(false);
          if (statusTimer) window.clearTimeout(statusTimer);
          return;
        } else {
          setExportReady(false);
        }
      } catch (e) {
        // keep trying silently
      }
      statusTimer = window.setTimeout(pollStatus, 2000);
    };
    pollStatus();
    
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      if (statusTimer) window.clearTimeout(statusTimer);
      if (headTimer) window.clearTimeout(headTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  // Close the "Save As" menu when clicking outside of it
  useEffect(() => {
    if (!isSelectingFormat) return;

    const handleClickOutside = (e: MouseEvent) => {
      const container = saveAsContainerRef.current;
      if (container && !container.contains(e.target as Node)) {
        setIsSelectingFormat(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectingFormat]);

  // Note: Copy and Start Over actions removed in favor of Save PDF / Save As / Home

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
  {/* Removed redundant intro per UI update */}

        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <div
            className="styled-scrollbar prose prose-sm sm:prose-base prose-invert max-w-none text-slate-300 leading-relaxed overflow-auto max-h-[60vh] prose-headings:text-slate-100 prose-a:text-teal-400 hover:prose-a:text-teal-300 prose-strong:text-slate-100 prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-teal-400"
            dangerouslySetInnerHTML={{ __html: tailoredResumeHtml }}
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 relative">
          <button
            onClick={() => handleDownloadExport('pdf', 'pdfButton')}
            disabled={!exportReady || downloadingFormat !== null}
            className={`flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition-colors ${(!exportReady || downloadingFormat !== null) ? 'bg-slate-700 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-500'}`}
            title={!exportReady ? 'Save will be available when processing completes' : ''}
          >
            {(downloadingFormat !== null && downloadSource === 'pdfButton') ? <div className="flex items-center justify-center"><LoadingSpinner size="sm" /></div> : 'Save PDF'}
          </button>

          <div className="flex-1" ref={saveAsContainerRef}>
            <button
              onClick={() => exportReady && setIsSelectingFormat(v => !v)}
              disabled={!exportReady || downloadingFormat !== null}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition-colors ${(!exportReady || downloadingFormat !== null) ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              title={!exportReady ? 'Save As will be available when processing completes' : ''}
            >
              {(downloadingFormat !== null && downloadSource === 'saveAs') ? <div className="flex items-center justify-center"><LoadingSpinner size="sm" /></div> : 'Save As...'}
            </button>

            {isSelectingFormat && (
              <div className="absolute z-20 mt-2 w-full sm:w-auto bg-slate-800 border border-slate-700 rounded-md shadow-lg p-2 sm:min-w-[16rem]">
                <p className="text-slate-300 text-sm px-2 py-1">Choose a format</p>
                <div className="grid grid-cols-1 gap-1 mt-1">
                  {EXPORT_FORMATS.map(fmt => (
                    <button
                      key={fmt.key}
                      onClick={() => handleDownloadExport(fmt.key, 'saveAs')}
                      className="text-left px-3 py-2 rounded hover:bg-slate-700 text-slate-200"
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-slate-700 pt-8">
            <h2 className="text-3xl font-bold text-center text-slate-100 mb-8">Final Resume Analysis & Score Improvement</h2>
            
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-around items-center mb-6 pb-6 border-b border-slate-700 gap-4">
                    <ScoreDisplay label="Original Score" score={initialScore} rawCsv={initialRawScoreCsv} />
                    
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400 hidden sm:block transform sm:rotate-0 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    
                    <ScoreDisplay label="Tailored Score" score={newScore} rawCsv={newRawScoreCsv} />
                </div>
                
                <div className="min-h-[24rem] flex flex-col">
                    <h3 className="text-xl font-semibold text-slate-200 mb-4">Tailored Resume Analysis</h3>
                    {isLoadingNewAnalysis ? (
                        <div className="flex-grow flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : (
                      <div
                          className="analysis-content styled-scrollbar prose prose-sm prose-invert max-w-none text-slate-300 overflow-auto flex-grow"
                          dangerouslySetInnerHTML={{ __html: newAnalysisHtml }}
                      />
                    )}
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;