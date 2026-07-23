import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage, downloadBlobResponse } from '../lib/axios.js';

/**
 * Runs a file-processing tool endpoint that responds with a downloadable file.
 * Tracks upload progress and triggers the browser download on success.
 */
export default function useToolJob() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const run = useCallback(async (endpoint, formData, { fallbackName = 'output', onSuccess } = {}) => {
    setIsLoading(true);
    setProgress(0);
    try {
      const response = await api.post(endpoint, formData, {
        responseType: 'blob',
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const filename = downloadBlobResponse(response, fallbackName);
      toast.success(`Done! Downloaded ${filename}`);
      onSuccess?.(response);
      return true;
    } catch (error) {
      // Blob error responses need to be read as text
      let message = 'Something went wrong';
      const blob = error?.response?.data;
      if (blob instanceof Blob) {
        try {
          message = JSON.parse(await blob.text()).message || message;
        } catch {
          message = apiErrorMessage(error);
        }
      } else {
        message = apiErrorMessage(error);
      }
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, []);

  return { run, isLoading, progress };
}
