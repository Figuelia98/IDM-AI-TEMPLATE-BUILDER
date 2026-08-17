import { useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';

export default function AiChat({ messages, busy, canUndo, openai, onSend, onUndo }) {
  const [draft, setDraft] = useState('');
  const enabled = openai?.enabled;

  function submit(event) {
    event.preventDefault();
    const instruction = draft.trim();
    if (!instruction || busy) return;
    onSend(instruction);
    setDraft('');
  }

  return (
    <section className="panel h-full">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
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
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Try: “Change the consignee to ACME France” or “set SSCC to 312345601000030999”.
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
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-infor-blue"
          placeholder="Describe a change…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn-primary" disabled={busy || !draft.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
