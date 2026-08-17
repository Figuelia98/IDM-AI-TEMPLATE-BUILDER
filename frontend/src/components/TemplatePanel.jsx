import { Eye, FileText, PencilLine } from 'lucide-react';

const fieldRows = [
  ['Document title', 'Transport Label'],
  ['Customer', 'MMS485PF'],
  ['Reference', 'Template #106'],
  ['Date', '17 Aug 2026'],
];

export default function TemplatePanel({ onShowPreview }) {
  return (
    <section className="panel h-full min-h-0 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-infor-navy">Template</h3>
          <p className="mt-1 text-xs text-slate-500">Word-style editor surface for the document layout.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onShowPreview}>
          <Eye className="h-4 w-4" />
          Show preview
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
        <div className="word-document-shell">
          <div className="word-ruler" aria-hidden="true" />
          <div className="word-page" role="document" aria-label="Word-like template page">
            <div className="word-page-header">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Document Layout
              </div>
              <div className="word-header-tag">Template</div>
            </div>

            <div className="word-page-content">
              <div className="word-block word-block-title">Transport Label</div>
              <div className="word-block word-block-subtitle">MMS485PF</div>

              <div className="word-form-grid">
                {fieldRows.map(([label, value]) => (
                  <div key={label} className="word-form-row">
                    <span className="word-form-label">{label}</span>
                    <span className="word-form-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="word-block word-block-body">
                <div className="word-paragraph-line" />
                <div className="word-paragraph-line short" />
                <div className="word-paragraph-line" />
                <div className="word-paragraph-line" />
                <div className="word-paragraph-line medium" />
              </div>

              <div className="word-block word-block-table">
                <div className="word-table-head">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Value</span>
                </div>
                <div className="word-table-row">
                  <span>TR-01</span>
                  <span>Shipment reference</span>
                  <span>__FIELD__</span>
                </div>
                <div className="word-table-row">
                  <span>TR-02</span>
                  <span>Customer name</span>
                  <span>__FIELD__</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
