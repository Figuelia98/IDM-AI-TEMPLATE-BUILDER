import { useEffect, useState } from 'react';
import { Download, FileCode2, FileType, ListTree, Loader2, RotateCcw, TableProperties } from 'lucide-react';
import AiChat from './components/AiChat';
import FieldTree from './components/FieldTree';
import MappingPanel from './components/MappingPanel';
import PreviewPanel from './components/PreviewPanel';
import UploadPanel from './components/UploadPanel';
import {
  aiEdit,
  downloadExport,
  getHealth,
  loadSamples,
  undoEdit,
  updateField,
  uploadFiles,
} from './api';

function newMessage(role, text, patches = []) {
  return { id: `${Date.now()}-${Math.random()}`, role, text, patches };
}

function toggleClass(active) {
  return active
    ? 'btn-secondary !bg-white !text-infor-navy !border-white'
    : 'btn-secondary !bg-white/10 !text-white !border-white/20';
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [structureFile, setStructureFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showFields, setShowFields] = useState(true);
  const [showMapping, setShowMapping] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  function applyDocument(next) {
    setDocument(next);
    setPreviewRevision((value) => value + 1);
  }

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      applyDocument(await action());
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    await run(() => uploadFiles(structureFile, templateFile));
  }

  async function handleSamples() {
    await run(() => loadSamples());
  }

  async function handleSave(xpath, value) {
    await run(() => updateField(xpath, value));
  }

  async function handleAi(instruction) {
    setMessages((current) => [...current, newMessage('user', instruction)]);
    setBusy(true);
    setError('');
    try {
      const result = await aiEdit(instruction);
      applyDocument(result.document);
      setMessages((current) => [
        ...current,
        newMessage('assistant', result.summary || 'Updated fields.', result.patches || []),
      ]);
    } catch (err) {
      const text = err.message || 'AI edit failed';
      setError(text);
      setMessages((current) => [...current, newMessage('error', text)]);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    await run(() => undoEdit());
    setMessages((current) => [...current, newMessage('assistant', 'Reverted the last XML change.')]);
  }

  async function handleExport(kind) {
    setBusy(true);
    setError('');
    try {
      await downloadExport(kind);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  function handleNewFiles() {
    setDocument(null);
    setPreviewRevision(0);
    setMessages([]);
    setShowFields(true);
    setShowMapping(false);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-infor-navy px-6 py-3 text-white">
        <div>
          <h1 className="text-base font-semibold">IDM AI Template Builder</h1>
          <p className="text-xs text-slate-300">M3 XML structure + Word template → XML / DOCX</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {document ? (
            <>
              <button type="button" className={toggleClass(showFields)} onClick={() => setShowFields((value) => !value)}>
                <ListTree className="h-4 w-4" />
                Fields
              </button>
              <button type="button" className={toggleClass(showMapping)} onClick={() => setShowMapping((value) => !value)}>
                <TableProperties className="h-4 w-4" />
                Mapping
              </button>
              <button type="button" className="btn-secondary !bg-white/10 !text-white !border-white/20" onClick={handleNewFiles}>
                <RotateCcw className="h-4 w-4" />
                New files
              </button>
              <button type="button" className="btn-secondary !bg-white/10 !text-white !border-white/20" disabled={busy} onClick={() => handleExport('xml')}>
                <FileCode2 className="h-4 w-4" />
                Export XML
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => handleExport('docx')}>
                <FileType className="h-4 w-4" />
                Export DOCX
              </button>
            </>
          ) : null}
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-200" /> : <Download className="h-4 w-4 text-slate-400" />}
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!document ? (
        <UploadPanel
          structureFile={structureFile}
          templateFile={templateFile}
          onStructure={setStructureFile}
          onTemplate={setTemplateFile}
          onUpload={handleUpload}
          onLoadSamples={handleSamples}
          busy={busy}
        />
      ) : (
        <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
          {showFields ? (
            <div className="flex w-80 shrink-0 flex-col">
              <FieldTree tree={document.tree} onSave={handleSave} />
            </div>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PreviewPanel previewRevision={previewRevision} documentLoaded={!!document} />
          </div>
          {showMapping ? (
            <div className="flex w-80 shrink-0 flex-col">
              <MappingPanel document={document} />
            </div>
          ) : null}
          <div className="flex w-80 shrink-0 flex-col">
            <AiChat
              messages={messages}
              busy={busy}
              canUndo={document.can_undo}
              openai={health?.openai}
              onSend={handleAi}
              onUndo={handleUndo}
            />
          </div>
        </main>
      )}
    </div>
  );
}
