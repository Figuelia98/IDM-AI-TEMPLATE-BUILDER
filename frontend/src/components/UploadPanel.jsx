import { useRef, useState } from 'react';
import { FileCode2, FileType2 } from 'lucide-react';

function DropZone({ label, hint, accept, file, onFile }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  function pick(selected) {
    if (selected) onFile(selected);
  }

  return (
    <label
      className={`drop-zone ${active ? 'drop-zone-active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        pick(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      {file ? (
        <p className="mt-3 max-w-full truncate rounded-md bg-white px-2 py-1 text-xs text-infor-blue">
          {file.name}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Drop a file or click to browse</p>
      )}
    </label>
  );
}

export default function UploadPanel({
  structureFile,
  templateFile,
  onStructure,
  onTemplate,
  onUpload,
  onLoadSamples,
  busy,
}) {
  const ready = Boolean(structureFile && templateFile);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-infor-navy">Load an IDM document pair</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upload the M3 structure XML and the Word XML/DOCX template, then edit fields or describe
          changes in natural language.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileCode2 className="h-4 w-4 text-infor-blue" />
            Structure XML
          </div>
          <DropZone
            label="M3OutDocument XML"
            hint="MMS485PF_StructureXml.xml"
            accept=".xml,text/xml,application/xml"
            file={structureFile}
            onFile={onStructure}
          />
        </div>
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileType2 className="h-4 w-4 text-infor-blue" />
            Word template
          </div>
          <DropZone
            label="Word XML or DOCX"
            hint="MMS485PF Transport Label_Template.xml"
            accept=".xml,.docx,application/xml,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            file={templateFile}
            onFile={onTemplate}
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn-primary" disabled={!ready || busy} onClick={onUpload}>
          {busy ? 'Loading…' : 'Open documents'}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onLoadSamples}>
          Load MMS485PF samples
        </button>
      </div>
    </div>
  );
}
