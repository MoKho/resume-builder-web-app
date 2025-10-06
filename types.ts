
export interface ProfileResponse {
  id: string;
  email: string | null;
  has_base_resume: boolean;
}

export interface JobHistoryResponse {
  id: number;
  user_id: string;
  company_name: string | null;
  job_title: string | null;
  achievements_list: string[] | null;
  detailed_background: string | null;
  is_default_rewrite: boolean | null;
}

export interface JobHistoryUpdate {
  id: number;
  detailed_background?: string | null;
  is_default_rewrite?: boolean | null;
}

export interface ResumeUpload {
  resume_text: string;
}

export interface ResumeTextResponse {
  resume_text: string;
}

export interface ApplicationCreate {
  target_job_description: string;
}

export interface ApplicationResponse {
  id: number;
  user_id: string;
  status: 'pending' | 'completed' | 'failed';
  target_job_description: string;
  final_resume_text: string | null;
  created_at: string;
}

export interface ResumeCheckRequest {
  job_post: string;
  resume_text?: string | null;
  summarize_job_post?: boolean | null;
}

export interface ResumeCheckJobResponse {
  job_id: string;
}

export interface ResumeCheckResultResponse {
  status: 'pending' | 'completed' | 'failed';
  analysis: string | null;
}
