import { useState } from 'react';
import { FileText, Plus, X, Download, Upload } from 'lucide-react';

const DEFAULT_RULES = [
  {
    id: 1,
    category: 'Format',
    title: 'Field Names in Uppercase',
    description: 'All field names (UDDLIX, ROPANR, SSCC) should be in UPPERCASE'
  },
  {
    id: 2,
    category: 'Format',
    title: 'Date Format ISO 8601',
    description: 'All dates should follow ISO 8601 format (YYYY-MM-DD)'
  },
  {
    id: 3,
    category: 'Format',
    title: 'Phone Number International',
    description: 'Phone numbers must use international format (+1-234-567-8900)'
  },
  {
    id: 4,
    category: 'Design',
    title: 'Field Hierarchy Max 5 Levels',
    description: 'Maximum nesting depth is 5 levels for field hierarchy'
  },
  {
    id: 5,
    category: 'Design',
    title: 'Logical Field Grouping',
    description: 'Group fields logically: Sender → Recipient → Items → Footer'
  },
  {
    id: 6,
    category: 'Implementation',
    title: 'Data Type Validation',
    description: 'Validate all data types before assignment according to schema'
  },
  {
    id: 7,
    category: 'Implementation',
    title: 'Cascading Updates',
    description: 'Apply cascading updates for dependent fields to maintain consistency'
  }
];

export default function RulesPanel({ useRules, onToggleRules, onExportRules, onAddRule }) {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ category: 'Format', title: '', description: '' });
  const [expandedRule, setExpandedRule] = useState(null);

  const handleAddRule = () => {
    if (newRule.title.trim() && newRule.description.trim()) {
      const rule = {
        id: Math.max(...rules.map(r => r.id), 0) + 1,
        category: newRule.category,
        title: newRule.title,
        description: newRule.description
      };
      setRules([...rules, rule]);
      setNewRule({ category: 'Format', title: '', description: '' });
      setShowAddRule(false);
      onAddRule?.(rule);
    }
  };

  const handleDeleteRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleExport = (format) => {
    let content = '';
    const timestamp = new Date().toLocaleString();

    if (format === 'txt') {
      content = `IDM AI Template Builder - Rules Export\n`;
      content += `Generated: ${timestamp}\n`;
      content += `Total Rules: ${rules.length}\n`;
      content += `\n${'='.repeat(60)}\n\n`;

      const byCategory = {};
      rules.forEach(rule => {
        if (!byCategory[rule.category]) byCategory[rule.category] = [];
        byCategory[rule.category].push(rule);
      });

      Object.entries(byCategory).forEach(([cat, catRules]) => {
        content += `## ${cat} Rules\n\n`;
        catRules.forEach((rule, idx) => {
          content += `${idx + 1}. ${rule.title}\n   ${rule.description}\n\n`;
        });
        content += '\n';
      });
    } else if (format === 'json') {
      content = JSON.stringify(
        {
          metadata: { timestamp, version: '1.0' },
          rules
        },
        null,
        2
      );
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rules-${new Date().getTime()}.${format === 'json' ? 'json' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const categories = [...new Set(rules.map(r => r.category))];

  return (
    <section className="panel h-full flex flex-col">
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-infor-blue" />
            <h3 className="text-sm font-semibold text-infor-navy">AI Rules</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useRules}
              onChange={(e) => onToggleRules(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-xs text-slate-600">Use Rules</span>
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAddRule(!showAddRule)}
            className="px-2 py-1 rounded text-xs bg-infor-blue text-white hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Rule
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Export TXT
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            JSON
          </button>
        </div>
      </header>

      {showAddRule && (
        <div className="border-b border-slate-100 p-3 bg-slate-50">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={newRule.category}
                onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="Format">Format</option>
                <option value="Design">Design</option>
                <option value="Implementation">Implementation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Title</label>
              <input
                type="text"
                value={newRule.title}
                onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                placeholder="Rule title"
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
              <textarea
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Describe the rule"
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs h-16 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddRule(false);
                  setNewRule({ category: 'Format', title: '', description: '' });
                }}
                className="px-2 py-1 rounded text-xs bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                className="px-2 py-1 rounded text-xs bg-infor-blue text-white hover:bg-blue-700"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-2">
        {categories.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No rules defined</p>
        ) : (
          categories.map((category) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 sticky top-0 bg-white py-1">
                {category}
              </h4>
              {rules
                .filter((r) => r.category === category)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded bg-slate-50 border border-slate-200 p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">{rule.title}</p>
                        <p className="text-slate-600 mt-1 text-[11px] leading-tight">
                          {rule.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="shrink-0 text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      <footer className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 text-center">
        {rules.length} rules • {useRules ? 'Active' : 'Inactive'}
      </footer>
    </section>
  );
}
