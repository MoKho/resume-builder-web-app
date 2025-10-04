
import type { ApplicationCreate, ApplicationResponse, JobHistoryResponse, JobHistoryUpdate, ProfileResponse, ResumeUpload } from './types';

const API_BASE_URL = 'https://resume-api-backend.onrender.com';

async function apiFetch<T,>(path: string, token: string, options: RequestInit = {}): Promise<T> {
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
    return null as T;
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

export const getAllJobHistories = (token: string): Promise<JobHistoryResponse[]> => {
    return apiFetch('/profiles/job-histories', token, { method: 'GET' });
};

export const updateJobHistories = (token: string, updates: JobHistoryUpdate[]): Promise<JobHistoryResponse[]> => {
  return apiFetch('/profiles/job-histories', token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
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
