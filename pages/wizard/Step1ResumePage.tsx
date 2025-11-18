import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { processResume, getResumeText, getGoogleDriveAuthStatus, getGoogleDriveAuthorizeUrl, openGoogleDriveFile, uploadResumeFile, API_BASE_URL } from '../../services/api';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';
import GoogleDriveIcon from '../../components/GoogleDriveIcon';
import { useGooglePicker } from '../../hooks/useGooglePicker';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Isolated section that initializes Google Picker only when rendered
const GoogleDriveImportSection: React.FC<{
  session: any;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isLoading: boolean;
  isFetchingResume: boolean;
  isImporting: boolean;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
  onFileSelected: (fileId: string | null) => void | Promise<void>;
}> = ({ session, addToast, isLoading, isFetchingResume, isImporting, setIsImporting, onFileSelected }) => {
  const { isPickerApiLoaded, getAccessToken } = useGooglePicker(onFileSelected);

  const handleImportFromDrive = useCallback(async () => {
    if (!session) return;
    setIsImporting(true);

    try {
      if (!isPickerApiLoaded) {
        addToast("Google components are still loading, please try again in a moment.", "info");
        setIsImporting(false);
        return;
      }

      const status = await getGoogleDriveAuthStatus(session.access_token);
      if (status.authenticated) {
        // Already authorized, get fresh access_token using GIS
        getAccessToken();
        return;
      }

      // Start auth flow to ensure consent and refresh token are saved server-side.
      // Always fetch a fresh authorize URL immediately before opening the popup.
      // If the popup reports an "invalid state" error, automatically retry a
      // small number of times by fetching a new URL and reopening the popup.
      const MAX_RETRIES = 2;

      const tryAuthorizeOnce = async (): Promise<{ success: boolean; invalidState?: boolean }> => {
        try {
          const { authorization_url } = await getGoogleDriveAuthorizeUrl(session.access_token);

          return await new Promise((resolve) => {
            let resolved = false;
            const API_ORIGIN = new URL(API_BASE_URL).origin;

            const handleAuthMessage = (event: MessageEvent) => {
              if (event.origin !== API_ORIGIN) return;

              const data = event.data || {};
              if (data.type === 'google-drive-auth') {
                // Ensure we only resolve once and clean up.
                if (resolved) return;
                resolved = true;
                window.removeEventListener('message', handleAuthMessage);
                if (data.status === 'ok') {
                  addToast('Google Drive connected successfully!', 'success');
                  resolve({ success: true });
                } else {
                  // If backend indicates an invalid state (CSRF/state mismatch), indicate for retry.
                  const err = (data.error || '').toString().toLowerCase();
                  const isInvalidState = err.includes('invalid state') || err.includes('invalid_state');
                  if (isInvalidState) {
                    // Do not show a toast for invalid state here; we'll retry silently.
                    resolve({ success: false, invalidState: true });
                  } else {
                    addToast(data.error || 'Google Drive authentication failed.', 'error');
                    resolve({ success: false });
                  }
                }
              }
            };

            window.addEventListener('message', handleAuthMessage);

            const authPopup = window.open(authorization_url, 'google-auth-popup', 'width=500,height=600');

            if (authPopup) {
              const timer = setInterval(() => {
                if (authPopup.closed) {
                  clearInterval(timer);
                  if (resolved) return;
                  resolved = true;
                  window.removeEventListener('message', handleAuthMessage);
                  // Allow a short delay for any in-flight message, then treat as cancelled.
                  setTimeout(() => resolve({ success: false }), 500);
                }
              }, 500);
            } else {
              window.removeEventListener('message', handleAuthMessage);
              addToast('Please enable popups for Google Drive authentication.', 'error');
              resolve({ success: false });
            }
          });
        } catch (err: any) {
          addToast(err?.message || 'Could not start Google Drive authentication.', 'error');
          return { success: false };
        }
      };

      let authSuccessful = false;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result = await tryAuthorizeOnce();
        if (result.success) {
          authSuccessful = true;
          break;
        }
        // If backend reported invalid state, loop to retry (fetching a fresh URL each time).
        if (!result.invalidState) break; // non-retryable failure
        // else loop to retry
      }

      if (authSuccessful) {
        // A small delay to allow the browser to refocus on the main window
        // after the popup closes, which can help ensure the Picker opens reliably.
        setTimeout(() => {
          getAccessToken();
        }, 300);
      } else {
        // Only show cancelled message if it wasn't a failure from the callback
        const statusAfterAuth = await getGoogleDriveAuthStatus(session.access_token);
        if (!statusAfterAuth.authenticated) {
          addToast('Google Drive authentication cancelled or failed.', 'info');
        }
        setIsImporting(false);
      }
    } catch (error: any) {
      addToast(error.message || 'Could not connect to Google Drive.', 'error');
      setIsImporting(false);
    }
  }, [session, isPickerApiLoaded, addToast, getAccessToken, setIsImporting]);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Import from Google Drive</h2>
        <p className="text-slate-400 mt-1">Recommended: Fast, accurate formatting, and fewer copy/paste errors.</p>
      </div>
      <button
        onClick={handleImportFromDrive}
        disabled={isLoading || isFetchingResume || isImporting}
        className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
      >
        {isImporting ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <GoogleDriveIcon className="w-5 h-5 mr-2" /> Connect Google Drive
          </>
        )}
      </button>
    </div>
  );
};

const Step1ResumePage: React.FC = () => {
  // Feature flag (Vite): controls visibility of Google Drive import
  const enableGoogleImport: boolean = (() => {
    try {
      const raw = (import.meta as any)?.env?.VITE_ENABLE_GOOGLE_IMPORT;
      if (raw === undefined || raw === null || raw === '') return false; // default Off
      return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
    } catch {
      return true;
    }
  })();

  // Minimal markdown styles to ensure readable headings and list bullets
  const MARKDOWN_PREVIEW_STYLES = `
    .md-preview h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0; }
    .md-preview h2 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0; }
    .md-preview h3 { font-size: 1.125rem; font-weight: 700; margin: 0.75rem 0; }
    .md-preview p { margin: 0.5rem 0; }
    .md-preview ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
    .md-preview ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0; }
    .md-preview li { margin: 0.25rem 0; }
    .md-preview strong { font-weight: 700; }
    .md-preview em { font-style: italic; }
    .md-preview code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
  `;
  const [resumeText, setResumeText] = useState('');
  const [originalResumeText, setOriginalResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingResume, setIsFetchingResume] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedFromDrive, setImportedFromDrive] = useState(false);
  const [importedFromUpload, setImportedFromUpload] = useState(false);
  const [importedMarkdown, setImportedMarkdown] = useState<string | null>(null);
  const [importedHtml, setImportedHtml] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const handleFileSelected = async (fileId: string | null) => {
    if (!fileId) {
      addToast('Import cancelled.', 'info');
      setIsImporting(false);
      return;
    }
    if (!session) return;

    setIsImporting(true);
    try {
      const response = await openGoogleDriveFile(session.access_token, fileId);
      // Always use raw text content for processing later
      setResumeText(response.content || '');
      // Prefer markdown for display if available; otherwise fall back to raw text
      const md = (response.content_md || '').trim();
      if (md) {
        setImportedMarkdown(md);
      } else {
        setImportedMarkdown(null);
      }
      setImportedFromDrive(true);
      addToast('Resume imported successfully from Google Drive!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to import from Google Drive.', 'error');
    } finally {
      setIsImporting(false);
    }
  };
  
  // Google Picker is initialized only when feature flag is ON via child component

  const handleLocalFileClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleLocalFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!session) return;

    const allowed = ['pdf', 'doc', 'docx', 'txt', 'md'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      addToast('Unsupported file type. Please upload pdf, doc, docx, txt, or md.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const res = await uploadResumeFile(session.access_token, file);
      setResumeText(res.content || '');
      const md = (res.content_md || '').trim();
      setImportedMarkdown(md ? md : null);
      setImportedFromUpload(true);
      setImportedFromDrive(false);
      addToast('Resume uploaded successfully!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to upload resume file.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // (Removed) Google Drive import handler moved into child component to avoid initializing Picker when flag is off.
  
  useEffect(() => {
    const fetchResume = async () => {
      if (session?.access_token && profile?.has_base_resume) {
        setIsFetchingResume(true);
        try {
          const response = await getResumeText(session.access_token);
          setResumeText(response.resume_text);
          setOriginalResumeText(response.resume_text);
        } catch (error: any) {
          addToast(error.message || 'Failed to fetch existing resume.', 'error');
        } finally {
          setIsFetchingResume(false);
        }
      }
    };
    if (profile) { // Ensure profile is loaded before fetching
        fetchResume();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile]);


  const handleNext = async () => {
    if (!resumeText.trim()) {
      addToast('Please paste your resume text.', 'error');
      return;
    }
    if (!session) return;

    setIsLoading(true);
    try {
      const hasResumeChanged = resumeText.trim() !== originalResumeText.trim();
      
      if (hasResumeChanged || !profile?.has_base_resume) {
        await processResume(session.access_token, { resume_text: resumeText });
        addToast('Resume processed successfully!', 'success');
      }
      
      navigate('/wizard/step-2');
    } catch (error: any)
      {
      addToast(error.message || 'Failed to process resume.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    if (profile?.has_base_resume) {
      navigate('/dashboard');
    } else {
        addToast("You need to upload a resume to continue.", "info");
    }
  };

  // Rendered HTML for markdown preview when imported from Drive (handles async parse)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!importedMarkdown) {
        setImportedHtml(null);
        return;
      }
      try {
        const parsed = await marked.parse(importedMarkdown as string);
        const safe = DOMPurify.sanitize(parsed as string);
        if (!cancelled) setImportedHtml(safe);
      } catch {
        if (!cancelled) setImportedHtml(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [importedMarkdown]);


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <style>{MARKDOWN_PREVIEW_STYLES}</style>
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-3xl font-bold mt-4">Setup Your Profile</h1>
          <p className="text-slate-400 mt-2">Step 1 of 2: Provide Your Master Resume</p>
        </div>
        {/* Actions */}
        <div className="flex justify-end mb-6 space-x-4">
          <button
            onClick={handleCancel}
            disabled={isLoading || !profile?.has_base_resume}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading || isFetchingResume}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Next'}
          </button>
        </div>
        {/* Primary: Upload or Import */}
        <div className="bg-slate-800 p-6 md:p-8 rounded-lg shadow-lg mb-6 relative">
          {isFetchingResume && (
            <div className="absolute inset-0 bg-slate-800/70 flex justify-center items-center rounded-lg z-10">
              <LoadingSpinner size="md" />
            </div>
          )}

          {/* Upload from device (moved to top) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Upload from your device</h2>
              <p className="text-slate-400 mt-1">PDF, DOC, DOCX, MD, or TXT supported.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                onChange={handleLocalFileChange}
                className="hidden"
              />
              <button
                onClick={handleLocalFileClick}
                disabled={isLoading || isFetchingResume || isImporting}
                className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
              >
                {isImporting ? <LoadingSpinner size="sm" /> : 'Upload Resume File'}
              </button>
            </div>
          </div>

          {/* Import from Google Drive (feature-flagged, avoids hook init when off) */}
          {enableGoogleImport && (
            <GoogleDriveImportSection
              session={session}
              addToast={addToast}
              isLoading={isLoading}
              isFetchingResume={isFetchingResume}
              isImporting={isImporting}
              setIsImporting={setIsImporting}
              onFileSelected={handleFileSelected}
            />
          )}

          {/* Preview when imported */}
          {(importedFromDrive || importedFromUpload) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Imported Preview</h3>
                <span className="text-xs text-slate-400">Editing is disabled for imported resumes</span>
              </div>
              {importedHtml ? (
                <div
                  className="styled-scrollbar md-preview max-w-none bg-slate-900 border border-slate-700 rounded-md p-4"
                  dangerouslySetInnerHTML={{ __html: importedHtml }}
                />
              ) : (
                <textarea
                  value={resumeText}
                  readOnly
                  className="styled-scrollbar w-full h-64 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-200"
                />
              )}
              <p className="text-xs text-slate-400 mt-2">
                We’ll use the plain text content for processing, preserving your original formatting when possible.
              </p>
            </div>
          )}
        </div>

        {/* Secondary: Manual paste (collapsed by default) */}
        <div className="bg-slate-800 p-0 rounded-lg shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-750/50 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold">Or paste your resume manually</h2>
              <p className="text-slate-400 mt-1">If you don’t use Google Drive, paste the full text below.</p>
            </div>
            <span className="ml-4 text-slate-400 text-sm">
              {manualOpen ? 'Hide' : 'Show'}
            </span>
          </button>
          {manualOpen && (
            <div className="px-6 pb-6">
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={
                  isFetchingResume
                    ? 'Loading your resume...'
                    : 'Paste your full resume here...'
                }
                className="styled-scrollbar w-full h-80 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isLoading || isFetchingResume || importedFromDrive || importedFromUpload}
              />
              {(importedFromDrive || importedFromUpload) && (
                <p className="text-xs text-amber-400 mt-2">
                  Imported from file/Drive — manual editing is disabled. To edit, clear the import by reloading the page.
                </p>
              )}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Step1ResumePage;