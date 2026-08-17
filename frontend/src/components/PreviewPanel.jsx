import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { getPreviewDocx } from '../api';

export default function PreviewPanel({ previewRevision, documentLoaded }) {
  const hostRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!documentLoaded) {
      return undefined;
    }

    let cancelled = false;
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    setStatus('loading');
    setError('');

    getPreviewDocx()
      .then(async (blob) => {
        if (cancelled) return;
        const staging = document.createElement('div');
        await renderAsync(blob, staging, undefined, {
          className: 'docx-wrapper',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
        if (cancelled) return;
        host.innerHTML = '';
        while (staging.firstChild) {
          host.appendChild(staging.firstChild);
        }
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(err.message || 'Could not render the filled template');
      });

    return () => {
      cancelled = true;
    };
  }, [previewRevision]);

  const updating = status === 'loading';

  return (
    <section className="panel h-full min-h-0">
      <header className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-infor-navy">Filled preview</h3>
        <p className="mt-1 text-xs text-slate-500">
          Word template with the current XML values. Updates after AI edits, field changes, and undo.
        </p>
      </header>
      <div className="relative min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
        {updating ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              Updating preview…
            </span>
          </div>
        ) : null}
        {status === 'error' ? (
          <p className="p-3 text-xs text-red-600">{error}</p>
        ) : null}
        <div ref={hostRef} className="docx-preview-host mx-auto min-h-full" />
      </div>
    </section>
  );
}
