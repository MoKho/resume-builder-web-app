import type {
  ApplicationCreate,
  ApplicationResponse,
  JobHistoryResponse,
  JobHistoryUpdate,
  ProfileResponse,
  ResumeUpload,
  ResumeTextResponse,
  ResumeCheckRequest,
  ResumeCheckJobResponse,
  ResumeCheckResultResponse,
  GoogleDriveAuthStatus,
  GoogleDriveAuthorizeUrl,
  GoogleDriveFileRequest,
  GoogleDriveFileResponse,
  UploadResumeResponse,
} from '../types';

// Default to production API; can be overridden by VITE_API_BASE_URL
const DEFAULT_API = 'https://api.p-q.app';
const viteApi = typeof import.meta !== 'undefined' ? (import.meta.env as any)?.VITE_API_BASE_URL : undefined;
export const API_BASE_URL: string = (viteApi && viteApi.length > 0) ? viteApi : DEFAULT_API;

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    console.error('API Error:', errorData);
    throw new Error(errorData.detail?.[0]?.msg || errorData.detail || 'API request failed');
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null as unknown as T;
  }

  return response.json();
}

export const getMyProfile = (token: string): Promise<ProfileResponse> => {
  return apiFetch('/profiles/me', token, { method: 'GET' });
};

export const processResume = (token: string, data: ResumeUpload): Promise<JobHistoryResponse[]> => {
  return apiFetch('/profiles/process-resume', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getResumeText = (token: string): Promise<ResumeTextResponse> => {
  return apiFetch('/profiles/resume-text', token, { method: 'GET' });
};

export const getAllJobHistories = (token: string): Promise<JobHistoryResponse[]> => {
  return apiFetch('/profiles/job-histories', token, { method: 'GET' });
};

export const updateJobHistories = (token: string, updates: JobHistoryUpdate[]): Promise<JobHistoryResponse[]> => {
  return apiFetch('/profiles/job-histories', token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const startResumeCheck = (token: string, data: ResumeCheckRequest): Promise<ResumeCheckJobResponse> => {
  return apiFetch('/profiles/check-resume', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getResumeCheckResult = (token: string, jobId: string): Promise<ResumeCheckResultResponse> => {
  return apiFetch(`/profiles/check-resume/${jobId}`, token, { method: 'GET' });
};

export const createApplication = (token: string, data: ApplicationCreate): Promise<ApplicationResponse> => {
  return apiFetch('/applications/', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getApplication = (token: string, applicationId: number): Promise<ApplicationResponse> => {
  return apiFetch(`/applications/${applicationId}`, token, { method: 'GET' });
};

// Google Drive APIs
export const getGoogleDriveAuthStatus = (token: string): Promise<GoogleDriveAuthStatus> => {
  return apiFetch('/google-drive/auth-status', token, { method: 'GET' });
};

export const getGoogleDriveAuthorizeUrl = (token: string): Promise<GoogleDriveAuthorizeUrl> => {
  return apiFetch('/google-drive/authorize', token, { method: 'GET' });
};

export const openGoogleDriveFile = (token: string, fileId: string): Promise<GoogleDriveFileResponse> => {
  const data: GoogleDriveFileRequest = { fileId };
  return apiFetch('/google-drive/open-file', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Upload resume file from local device (multipart/form-data)
export const uploadResumeFile = async (token: string, file: File): Promise<UploadResumeResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/profiles/upload-resume`, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type; browser will set the multipart boundary
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    console.error('API Error:', errorData);
    throw new Error(
      (errorData as any).detail?.[0]?.msg || (errorData as any).detail || (errorData as any).message || 'File upload failed'
    );
  }

  return response.json();
};
