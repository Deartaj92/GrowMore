import { useCallback } from 'react';

export function useCapacitorPdfSave() {
  const savePdf = useCallback(async (pdfBlob: Blob, filename: string, openAfterSave = false) => {
    try {
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true, uri: filename };
    } catch (err: any) {
      alert('Failed to save PDF: ' + (err.message || err));
      return { success: false, error: err.message || err };
    }
  }, []);

  return savePdf;
}