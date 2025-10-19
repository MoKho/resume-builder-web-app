import { useState, useEffect, useCallback } from 'react';

// IMPORTANT: Replace these placeholder values with your actual Google API credentials.
// You can obtain them from the Google Cloud Console.
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const GOOGLE_APP_ID = 'YOUR_GOOGLE_APP_ID_HERE';

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

    const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setMimeTypes('application/vnd.google-apps.document'); // Only Google Docs
        
    const picker = new window.google.picker.PickerBuilder()
      .setAppId(GOOGLE_APP_ID)
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

  return { showPicker, isPickerApiLoaded };
};