/// <reference types="vite/client" />
import { useState, useEffect, useCallback } from 'react';

// IMPORTANT: Replace these placeholder values with your actual Google API credentials.
// You can obtain them from the Google Cloud Console.
// Prefer Vite-style env vars (VITE_). Fall back to CRA-style REACT_APP_ for compatibility.
const _env = (import.meta as any).env || {};
// Read Google credentials only from environment. Do not fall back to inline placeholders.
const GOOGLE_API_KEY = _env.VITE_GOOGLE_DEVELOPER_KEY || _env.REACT_APP_GOOGLE_DEVELOPER_KEY;
const GOOGLE_CLIENT_ID = _env.VITE_GOOGLE_CLIENT_ID || _env.REACT_APP_GOOGLE_CLIENT_ID;

// Picker should surface Google Docs plus common resume upload formats
const ALLOWED_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

// Fail fast if credentials are missing
if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
  throw new Error(
    '[useGooglePicker] Google API credentials missing: VITE_GOOGLE_CLIENT_ID and/or VITE_GOOGLE_DEVELOPER_KEY (or their REACT_APP_ equivalents) are not set in the environment.'
  );
}
// Warn loudly during development if placeholder values are still present so it's obvious
// why Google's OAuth flow would fail with an invalid client_id.
if (typeof window !== 'undefined') {
  const missingCreds = !GOOGLE_CLIENT_ID || !GOOGLE_API_KEY;
  if (missingCreds && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    // eslint-disable-next-line no-console
    console.warn('[useGooglePicker] Google client ID or developer key missing. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_DEVELOPER_KEY in your .env.');
  }
}

// Fix: Augment the global Window interface to include `gapi` and `google` properties.
// These are loaded from external scripts and this change informs TypeScript about their
// existence on the `window` object, resolving property access errors.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

type PickerCallback = (fileId: string | null) => void;

export const useGooglePicker = (onFileSelect: PickerCallback) => {
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGISLoaded, setIsGISLoaded] = useState(false);

  // Load Google API script
  useEffect(() => {
    if (window.gapi) {
      window.gapi.load('client', () => setIsGapiLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('client', () => setIsGapiLoaded(true));
    };
    document.body.appendChild(script);
  }, []);

  // Load GIS script
  useEffect(() => {
    if (window.google && window.google.accounts) {
      setIsGISLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGISLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Load Picker API script once gapi is ready
  useEffect(() => {
    if (isGapiLoaded) {
        if (window.google && window.google.picker) {
            setIsPickerApiLoaded(true);
            return;
        }
        window.gapi.load('picker', () => setIsPickerApiLoaded(true));
    }
  }, [isGapiLoaded]);

  const showPicker = useCallback((oauthToken: string) => {
    if (!isPickerApiLoaded || !oauthToken) {
      console.error('Picker API not loaded or no OAuth token.');
      onFileSelect(null);
      return;
    }

    const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCUMENTS)
      // Allow Google Docs, DOCX and legacy DOC files (PDF excluded per latest requirement)
      .setMimeTypes(ALLOWED_MIME_TYPES.join(','));
        
    const picker = new window.google.picker.PickerBuilder()
      .setOAuthToken(oauthToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .addView(docsView)
      .setCallback((data: any) => {
        if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
          const doc = data[window.google.picker.Response.DOCUMENTS][0];
          onFileSelect(doc[window.google.picker.Document.ID]);
        } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
            onFileSelect(null);
        }
      })
      .build();
    picker.setVisible(true);
  }, [isPickerApiLoaded, onFileSelect]);

  const getAccessToken = useCallback(() => {
    if (!isGISLoaded) {
      console.error('Google Identity Services not loaded.');
      onFileSelect(null); // Indicate failure
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          showPicker(tokenResponse.access_token);
        } else {
          console.error('Failed to retrieve access token.');
          onFileSelect(null); // Indicate failure
        }
      },
    });
    tokenClient.requestAccessToken();
  }, [isGISLoaded, showPicker, onFileSelect]);

  return { isPickerApiLoaded, getAccessToken };
};