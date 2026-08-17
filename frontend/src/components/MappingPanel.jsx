export default function MappingPanel({ document }) {
  const controls = document?.controls || [];
  const mapped = controls.filter((control) => control.xpath);
  const unmapped = controls.filter((control) => !control.xpath);

  return (
    <section className="panel h-full">
      <header className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-infor-navy">Template mapping</h3>
        <p className="mt-1 text-xs text-slate-500">
          {document.mapped_count} of {controls.length} content controls bound to XML fields
        </p>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-2 overflow-hidden">
        <div className="min-h-0 overflow-auto border-b border-slate-100 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Mapped ({mapped.length})
          </p>
          {mapped.length === 0 ? (
            <p className="text-xs text-slate-400">No content controls matched XML fields yet.</p>
          ) : (
            <ul className="space-y-2">
              {mapped.map((control) => (
                <li key={control.control_id} className="rounded-md bg-emerald-50/70 px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {control.mapped_name || control.alias || 'Bound field'}
                    {control.resolved ? null : (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        missing in XML
                      </span>
                    )}
                  </p>
                  <p className="truncate font-mono text-[10px] text-slate-500">
                    {control.xpath || control.mapped_xpath}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-h-0 overflow-auto p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Unmapped controls ({unmapped.length})
          </p>
          {unmapped.length === 0 ? (
            <p className="text-xs text-slate-400">Every template control is mapped.</p>
          ) : (
            <ul className="space-y-2">
              {unmapped.map((control) => (
                <li key={control.control_id} className="rounded-md bg-amber-50 px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {control.alias || control.tag || 'Untitled control'}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">{control.text || 'No preview text'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
