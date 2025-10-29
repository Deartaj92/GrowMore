import { useCallback } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Optional: Only if you want to open the PDF after saving
// @ts-ignore
const FileOpener = window.FileOpener2 || (window as any).cordova?.plugins?.fileOpener2;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Remove the data:application/pdf;base64, prefix
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useCapacitorPdfSave() {
  const savePdf = useCallback(async (pdfBlob: Blob, filename: string, openAfterSave = false) => {
    try {
      const base64 = await blobToBase64(pdfBlob);

      // Save the file to the Documents directory
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      // Get the URI for the saved file
      const uriResult = await Filesystem.getUri({
        directory: Directory.Documents,
        path: filename
      });

      // Show success message with file location
      alert(`PDF saved successfully to: ${uriResult.uri}`);

      return { success: true, uri: uriResult.uri };
    } catch (err: any) {
      console.error('Error saving PDF:', err);
      alert('Failed to save PDF: ' + (err.message || err));
      return { success: false, error: err.message || err };
    }
  }, []);

  return savePdf;
} 