import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Brain, FileText, Clock, BookOpen, Sparkles, Send, Lightbulb, Save, Loader, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { useStore } from '../../store/useStore';

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  type: string;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function LawyerResearch() {
  const { currentUser } = useStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'history' | 'memos'>('search');
  const [recentSearches] = useState<string[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError('');
    try {
      const data = await api.post('/api/ai/chat', {
        message: `You are a legal research assistant for Pakistani law. Research this topic and provide findings with relevant statutes, case precedents, and analysis:\n\nTopic: ${query}`,
        history: [],
        noSession: true,
        noTools: true,
      });
      const raw = (data.response || '').replace(/\*\*/g, '').trim();
      const sections = raw.split(/\n(?=\d+\.|\- |\* |[A-Z][A-Za-z\s]+\:)/).filter(Boolean);
      const parsed: SearchResult[] = sections.length > 1
        ? sections.map((s: string, i: number) => ({
            id: String(i + 1),
            title: s.split('\n')[0].replace(/^[\d\.\-\*\s]+/, '').trim() || 'Finding',
            summary: s.trim(),
            type: s.toLowerCase().includes('case') || s.toLowerCase().includes('precedent') ? 'Case Precedent' : 'Legal Analysis',
          }))
        : [{ id: '1', title: 'Research Results', summary: raw, type: 'Analysis' }];
      setResults(parsed);
    } catch {
      setError('Research failed. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('legal-memos');
      if (stored) setMemos(JSON.parse(stored));
    } catch {}
  }, []);

  const saveAsMemo = () => {
    const content = results.map(r => `${r.title}\n${r.summary}`).join('\n\n---\n\n');
    const memo = { id: Date.now().toString(), title: query, content, createdAt: new Date().toISOString() };
    const updated = [memo, ...memos];
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  const deleteMemo = (id: string) => {
    const updated = memos.filter(m => m.id !== id);
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Legal Research</h1>
        <p className="text-slate-500">Search past cases, get AI-powered insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'search', label: 'Research', icon: Search },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'memos', label: 'Memos', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="text-emerald-600" size={24} />
              <h2 className="text-lg font-bold text-slate-900">AI-Powered Research</h2>
            </div>
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you're looking for... e.g., 'Find precedents for property disputes involving government land acquisition in Punjab'"
                className="w-full h-32 p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute bottom-4 right-4 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            {recentSearches.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-slate-500 mb-2">Recent searches:</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(search)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {isSearching && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-emerald-600 animate-pulse" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI is researching...</h3>
              <p className="text-slate-500">Searching through thousands of cases and legal documents</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {results.length > 0 && !isSearching && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Found {results.length} items</h3>
                <button onClick={saveAsMemo} className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700">
                  <Save size={15} /> Save as Memo
                </button>
              </div>
              {results.map((result, i) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{result.title}</h4>
                      <p className="text-sm text-emerald-600">{result.type}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 ml-12">{result.summary}</p>
                </motion.div>
              ))}
            </div>
          )}

          {results.length === 0 && !isSearching && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Start Your Research</h3>
              <p className="text-slate-500">Enter a query above to search through legal precedents and cases</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Search History</h3>
          {recentSearches.length > 0 ? (
            <div className="space-y-3">
              {recentSearches.map((search, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-slate-400" />
                    <span className="text-slate-700">{search}</span>
                  </div>
                  <button className="text-emerald-600 font-medium text-sm">Search Again</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No research history yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'memos' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Research Memos</h3>
          </div>
          {memos.length > 0 ? (
            <div className="space-y-3">
              {memos.map(memo => (
                <div key={memo.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{memo.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(memo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => deleteMemo(memo.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"
                    ><Trash2 size={15} /></button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">{memo.content.slice(0, 200)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No memos saved yet. Search and save results as memos.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
