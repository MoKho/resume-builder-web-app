
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { processResume } from '../../services/api';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';

const Step1ResumePage: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleNext = async () => {
    if (!resumeText.trim()) {
      addToast('Please paste your resume text.', 'error');
      return;
    }
    if (!session) return;

    setIsLoading(true);
    try {
      const jobHistories = await processResume(session.access_token, { resume_text: resumeText });
      addToast('Resume processed successfully!', 'success');
      navigate('/wizard/step-2', { state: { jobHistories } });
    } catch (error: any) {
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
        
        <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your full resume here..."
            className="w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={isLoading}
          />
        </div>
        
        <div className="flex justify-end mt-6 space-x-4">
          <button
            onClick={handleCancel}
            disabled={isLoading || !profile?.has_base_resume}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step1ResumePage;
