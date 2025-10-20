import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { processResume, getResumeText, getGoogleDriveAuthStatus, getGoogleDriveAuthorizeUrl, openGoogleDriveFile, API_BASE_URL } from '../../services/api';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';
import GoogleDriveIcon from '../../components/GoogleDriveIcon';
import { useGooglePicker } from '../../hooks/useGooglePicker';

const Step1ResumePage: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [originalResumeText, setOriginalResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingResume, setIsFetchingResume] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
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
      setResumeText(response.content);
      addToast('Resume imported successfully from Google Drive!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to import from Google Drive.', 'error');
    } finally {
      setIsImporting(false);
    }
  };
  
  const { isPickerApiLoaded, getAccessToken } = useGooglePicker(handleFileSelected);

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

      // Start auth flow to ensure consent and refresh token are saved server-side
      const { authorization_url } = await getGoogleDriveAuthorizeUrl(session.access_token);
      const authSuccessful = await new Promise<boolean>((resolve) => {
        const handleAuthMessage = (event: MessageEvent) => {
          const API_ORIGIN = new URL(API_BASE_URL).origin;
          if (event.origin !== API_ORIGIN) {
            return;
          }

          const data = event.data || {};
          if (data.type === 'google-drive-auth') {
            window.removeEventListener('message', handleAuthMessage);
            if (data.status === 'ok') {
              addToast('Google Drive connected successfully!', 'success');
              resolve(true);
            } else {
              addToast(data.error || 'Google Drive authentication failed.', 'error');
              resolve(false);
            }
          }
        };

        window.addEventListener('message', handleAuthMessage);

        const authPopup = window.open(authorization_url, 'google-auth-popup', 'width=500,height=600');

        if (authPopup) {
          const timer = setInterval(() => {
            if (authPopup.closed) {
              clearInterval(timer);
              window.removeEventListener('message', handleAuthMessage);
              // A timeout allows any pending message to be processed before we assume cancellation.
              setTimeout(() => resolve(false), 500);
            }
          }, 500);
        } else {
          window.removeEventListener('message', handleAuthMessage);
          addToast('Please enable popups for Google Drive authentication.', 'error');
          resolve(false);
        }
      });

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
  }, [session, isPickerApiLoaded, addToast, getAccessToken]);
  
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


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-3xl font-bold mt-4">Setup Your Profile</h1>
          <p className="text-slate-400 mt-2">Step 1 of 2: Provide Your Master Resume</p>
        </div>
        
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

        <div className="bg-slate-800 p-8 rounded-lg shadow-lg relative">
           {isFetchingResume && (
            <div className="absolute inset-0 bg-slate-800/70 flex justify-center items-center rounded-lg z-10">
              <LoadingSpinner size="md" />
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-400">Paste your resume or import from a Google Doc.</p>
            <button
                onClick={handleImportFromDrive}
                disabled={isLoading || isFetchingResume || isImporting}
                className="flex-shrink-0 flex items-center justify-center px-4 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isImporting ? 
                  <LoadingSpinner size="sm"/> : 
                  <><GoogleDriveIcon className="w-5 h-5 mr-2" /> Import from Drive</>
                }
            </button>
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder={
                isFetchingResume 
                ? "Loading your resume..." 
                : "Paste your full resume here..."
            }
            className="styled-scrollbar w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={isLoading || isFetchingResume}
          />
        </div>
        
      </div>
    </div>
  );
};

export default Step1ResumePage;