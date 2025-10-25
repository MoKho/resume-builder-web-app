This repository contains a Vite + React SPA (in this folder).

Quick notes to deploy to Google Cloud Run (using the Dockerfile in this folder):

1) Set up Cloud Run to build from this repo (choose the `resume-builder-web-app` subdirectory as build context or place Dockerfile here).

2) Required environment variables (set in Cloud Run service settings or Secret Manager):
   - VITE_API_BASE_URL: the base URL of your backend API (e.g., https://api.example.com)
   - VITE_GOOGLE_DEVELOPER_KEY and VITE_GOOGLE_CLIENT_ID if using Google Drive integration
   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY if using Supabase

3) Build & run behavior
   - The Dockerfile performs a production build (npm run build) and serves `dist/` with `serve`.
   - The container listens on the port provided by the Cloud Run environment variable `$PORT`.

4) Recommendations
   - Ensure your backend API is reachable from Cloud Run (CORS configured and public or accessible via VPC).
   - Do not expose server-only secrets in VITE_ prefixed vars; store them in a backend service or Cloud Secret Manager for server components.
   - If you want Cloud Build to build from the repository root and this folder is not the build context, configure the Cloud Build step to use `resume-builder-web-app` as the directory.

5) Optional: Using Cloud Buildpacks (no Dockerfile)
   - Cloud Run can build Node apps automatically, but including a Dockerfile gives you reproducible builds and explicit control.

6) To deploy from gcloud once configured locally (example):
   gcloud run deploy my-resume-app \
     --source="." \
     --project=PROJECT_ID \
     --region=REGION \
     --allow-unauthenticated

Adjust the above `--source` to point to the repository root and configure Cloud Build to use the `resume-builder-web-app` subdirectory, or run the deploy from inside that subdirectory.
