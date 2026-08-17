import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

function nodeMatches(node, query) {
  if (!query) return true;
  const haystack = `${node.name} ${node.label || ''} ${node.value || ''} ${node.xpath}`.toLowerCase();
  return haystack.includes(query);
}

function filterTree(node, query) {
  if (!query) return node;
  const children = (node.children || []).map((child) => filterTree(child, query)).filter(Boolean);
  if (children.length || nodeMatches(node, query)) {
    return { ...node, children };
  }
  return null;
}

function LeafRow({ node, onSave }) {
  const [value, setValue] = useState(node.value || '');

  useEffect(() => {
    setValue(node.value || '');
  }, [node.xpath, node.value]);

  return (
    <div className="group rounded-lg border border-transparent px-2 py-1.5 hover:border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-800">
            {node.label || node.name}
            {node.mapped ? (
              <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                mapped
              </span>
            ) : null}
          </p>
          <p className="truncate font-mono text-[10px] text-slate-400">{node.name}</p>
        </div>
      </div>
      <input
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-infor-blue"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value !== (node.value || '')) onSave(node.xpath, value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
}

function TreeNode({ node, depth, onSave }) {
  const [open, setOpen] = useState(depth < 3);
  if (node.is_leaf) {
    return <LeafRow node={node} onSave={onSave} />;
  }
  const childCount = node.children?.length || 0;
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
        style={{ paddingLeft: depth * 8 }}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="truncate">{node.label || node.name}</span>
        <span className="text-[10px] font-normal text-slate-400">{childCount}</span>
      </button>
      {open
        ? (node.children || []).map((child) => (
            <TreeNode key={child.xpath} node={child} depth={depth + 1} onSave={onSave} />
          ))
        : null}
    </div>
  );
}

export default function FieldTree({ tree, onSave }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => (tree ? filterTree(tree, query.trim().toLowerCase()) : null), [tree, query]);

  return (
    <section className="panel h-full">
      <header className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-infor-navy">Structure fields</h3>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-infor-blue"
            placeholder="Search name, label, or value"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {filtered ? <TreeNode node={filtered} depth={0} onSave={onSave} /> : (
          <p className="p-3 text-xs text-slate-400">No fields match this search.</p>
        )}
      </div>
    </section>
  );
}
