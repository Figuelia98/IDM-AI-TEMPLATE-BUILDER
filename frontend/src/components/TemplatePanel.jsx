import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getPreviewPdf, getTemplatePdf } from '../api';

export default function TemplatePanel({ document, previewRevision, documentLoaded }) {
  const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error'
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('preview'); // 'template' or 'preview'
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!documentLoaded) return;

    let cancelled = false;
    
    setStatus('loading');
    setError('');

    const fetchPdf = viewMode === 'template' ? getTemplatePdf : getPreviewPdf;

    fetchPdf()
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl((prevUrl) => {
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
          }
          return url;
        });
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(err.message || `Could not render the ${viewMode} PDF`);
      });

    return () => {
      cancelled = true;
    };
  }, [previewRevision, documentLoaded, viewMode]);

  const updating = status === 'loading';

  return (
    <section className="panel h-full min-h-0 flex flex-col relative bg-slate-200">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shrink-0 shadow-sm z-10">
        <div>
          <h3 className="text-sm font-semibold text-infor-navy">
            {viewMode === 'template' ? 'Template Structure' : 'Filled Preview'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {viewMode === 'template' 
              ? 'Raw Word template in high-fidelity PDF.' 
              : 'Word template with current XML values in high-fidelity PDF.'}
          </p>
        </div>
        <button 
          type="button" 
          className={viewMode === 'template' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setViewMode(v => v === 'template' ? 'preview' : 'template')}
        >
          {viewMode === 'template' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {viewMode === 'template' ? 'Show filled preview' : 'Show raw template'}
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {updating ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-infor-navy mb-4" />
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
              Rendering {viewMode} to PDF...
            </span>
          </div>
        ) : null}
        
        {status === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg max-w-md shadow-sm">
              <h4 className="font-semibold mb-1">Rendering Failed</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : null}
        
        {pdfUrl && status !== 'error' && (
          <embed 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`} 
            type="application/pdf" 
            className={`w-full h-full transition-opacity duration-300 ${updating ? 'opacity-50' : 'opacity-100'}`}
          />
        )}
      </div>
    </section>
  );
}
