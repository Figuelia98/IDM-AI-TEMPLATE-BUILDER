import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

function XpathBadge({ xpath }) {
  if (!xpath) return null;
  return (
    <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
      {xpath}
    </span>
  );
}

function ReasonBadge({ control }) {
  if (control.xpath && control.resolved) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Resolved
      </span>
    );
  }
  if (control.xpath && !control.resolved) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
        <AlertTriangle className="h-2.5 w-2.5" />
        XPath not in XML
      </span>
    );
  }
  if (!control.xpath) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
        <XCircle className="h-2.5 w-2.5" />
        No binding
      </span>
    );
  }
  return null;
}

export default function MappingPanel({ document }) {
  const controls = document?.controls || [];
  const mapped = controls.filter((c) => c.xpath && c.resolved);
  const xpathMissing = controls.filter((c) => c.xpath && !c.resolved);
  const noBinding = controls.filter((c) => !c.xpath);
  const total = controls.length;

  return (
    <section className="panel h-full overflow-hidden flex flex-col">
      <header className="border-b border-slate-100 px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-infor-navy">Template mapping</h3>
        <p className="mt-1 text-xs text-slate-500">
          {document.mapped_count} of {total} content controls bound &amp; resolved
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {mapped.length} resolved
          </span>
          {xpathMissing.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              {xpathMissing.length} XPath missing
            </span>
          )}
          {noBinding.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-200">
              <XCircle className="h-2.5 w-2.5" />
              {noBinding.length} no binding
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto divide-y divide-slate-100">

        {/* ── Resolved mapped controls ── */}
        {mapped.length > 0 && (
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Resolved ({mapped.length})
            </p>
            <ul className="space-y-1.5">
              {mapped.map((control) => (
                <li key={control.control_id} className="rounded-md bg-emerald-50/70 px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {control.mapped_name || control.alias || 'Bound field'}
                    </p>
                    <ReasonBadge control={control} />
                  </div>
                  <XpathBadge xpath={control.xpath || control.mapped_xpath} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── XPath binding exists but not found in the XML ── */}
        {xpathMissing.length > 0 && (
          <div className="p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                XPath not in XML ({xpathMissing.length})
              </p>
              <Info className="h-3 w-3 text-amber-500" />
            </div>
            <p className="mb-2 text-[10px] text-slate-500">
              These controls have an XPath binding, but the path did not match any node in your uploaded Structure XML. Check that the XPath is correct and the Structure XML contains this field.
            </p>
            <ul className="space-y-1.5">
              {xpathMissing.map((control) => (
                <li key={control.control_id} className="rounded-md bg-amber-50 px-2 py-1.5 border border-amber-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {control.mapped_name || control.alias || control.text || 'Unknown control'}
                    </p>
                    <ReasonBadge control={control} />
                  </div>
                  <XpathBadge xpath={control.xpath} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── No binding at all ── */}
        {noBinding.length > 0 && (
          <div className="p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                No binding ({noBinding.length})
              </p>
              <Info className="h-3 w-3 text-red-400" />
            </div>
            <p className="mb-2 text-[10px] text-slate-500">
              These controls have no XPath or IDM binding configured. They will never be filled. To fix, add an IDM binding (JSON or XPath) to the control's alias or tag in the Word template.
            </p>
            <ul className="space-y-1.5">
              {noBinding.map((control) => (
                <li key={control.control_id} className="rounded-md bg-red-50 px-2 py-1.5 border border-red-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-slate-700">
                      {control.alias || control.tag || control.text || 'Unnamed control'}
                    </p>
                    <ReasonBadge control={control} />
                  </div>
                  {control.text && (
                    <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                      Placeholder: "{control.text}"
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {controls.length === 0 && (
          <div className="p-4 text-xs text-slate-400 text-center">
            No content controls found in the template.
          </div>
        )}

      </div>
    </section>
  );
}
