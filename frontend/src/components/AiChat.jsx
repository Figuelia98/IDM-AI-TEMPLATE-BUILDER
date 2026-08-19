import { useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';

const CHAT_MODES = {
  ASK: { id: 'ask', label: 'Ask', icon: '❓', description: 'Ask questions about the template' },
  AGENT: { id: 'agent', label: 'Agent', icon: '🤖', description: 'Let AI handle template modifications' },
  PLAN: { id: 'plan', label: 'Plan', icon: '📋', description: 'Create a plan for template changes' },
  DEBUG: { id: 'debug', label: 'Debug', icon: '🔍', description: 'Debug and analyze template issues' }
};

export default function AiChat({ messages, busy, canUndo, openai, onSend, onUndo }) {
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState(CHAT_MODES.ASK.id);
  const enabled = openai?.enabled;
  
  const currentMode = Object.values(CHAT_MODES).find(m => m.id === mode);

  function submit(event) {
    event.preventDefault();
    const instruction = draft.trim();
    if (!instruction || busy) return;
    onSend(instruction, mode);
    setDraft('');
  }

  return (
    <section className="panel h-full">
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-infor-navy">AI editor</h3>
            <p className="text-xs text-slate-500">
              {enabled ? `Using ${openai.model || 'OpenAI'}` : openai?.reason || 'AI unavailable'}
            </p>
          </div>
          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" disabled={!canUndo || busy} onClick={onUndo}>
            <RotateCcw className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
        
        {/* Mode Selector */}
        <div className="flex gap-2 flex-wrap">
          {Object.values(CHAT_MODES).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              disabled={busy}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                mode === m.id
                  ? 'bg-infor-blue text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={m.description}
            >
              <span className="mr-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {mode === 'ask' && (
              <>
                <p className="font-semibold text-slate-700 mb-2">Ask Mode</p>
                <p>Ask questions about your template:</p>
                <p className="mt-2 text-slate-600">Examples: "What fields are in this template?", "What is the maximum length of the SSCC field?"</p>
              </>
            )}
            {mode === 'agent' && (
              <>
                <p className="font-semibold text-slate-700 mb-2">Agent Mode</p>
                <p>Let AI modify your template:</p>
                <p className="mt-2 text-slate-600">Examples: "Change the consignee to ACME France", "Set SSCC to 312345601000030999"</p>
              </>
            )}
            {mode === 'plan' && (
              <>
                <p className="font-semibold text-slate-700 mb-2">Plan Mode</p>
                <p>Create a structured plan for changes:</p>
                <p className="mt-2 text-slate-600">Examples: "Plan how to add a new shipment field", "Create a step-by-step plan to restructure the template"</p>
              </>
            )}
            {mode === 'debug' && (
              <>
                <p className="font-semibold text-slate-700 mb-2">Debug Mode</p>
                <p>Debug and analyze template issues:</p>
                <p className="mt-2 text-slate-600">Examples: "Why is this field invalid?", "Check for missing required fields", "Validate the template structure"</p>
              </>
            )}
            {!enabled ? (
              <p className="mt-2">
                Without an API key you can still type <code>set &lt;field&gt; to &lt;value&gt;</code>.
              </p>
            ) : null}
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg px-3 py-2 text-xs ${
              message.role === 'user'
                ? 'ml-8 bg-infor-blue text-white'
                : message.role === 'error'
                  ? 'mr-8 bg-red-50 text-red-700'
                  : 'mr-8 bg-slate-100 text-slate-700'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
            {message.patches?.length ? (
              <ul className="mt-2 space-y-1 border-t border-white/20 pt-2">
                {message.patches.map((patch) => (
                  <li key={patch.xpath} className="font-mono text-[10px] opacity-80">
                    {patch.xpath.split('/').pop()} → {patch.value || '∅'}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-slate-100 p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-infor-blue"
            placeholder={`${currentMode?.label} mode: ${currentMode?.description.toLowerCase()}...`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn-primary" disabled={busy || !draft.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
