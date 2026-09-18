import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { MessageSquareText, Send, X, FileText, Sparkles } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import ToolShell from '../../components/tools/ToolShell.jsx';
import AiSetupNotice from '../../components/tools/AiSetupNotice.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Card from '../../components/ui/Card.jsx';
import { cn, formatBytes } from '../../lib/utils.js';

const SUGGESTIONS = [
  'What is this document about?',
  'Summarize the key points',
  'What are the most important dates?',
  'List any action items or conclusions',
];

export default function ChatWithPdf() {
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('question', q);
      form.append(
        'history',
        '' // history via JSON not supported in multipart cleanly; send last messages inline
      );
      // Use JSON-friendly endpoint: send history as repeated fields
      const historyPayload = messages.slice(-8);
      form.set('history', JSON.stringify(historyPayload));
      const { data } = await api.post('/ai/chat', form);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.answer }]);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setMessages((prev) => prev.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      icon={MessageSquareText}
      title="Chat with PDF"
      description="Ask questions and get answers grounded in your document."
    >
      <AiSetupNotice />
      {!file ? (
        <Dropzone
          onFiles={(files) => setFile(files[0])}
          multiple={false}
          accept={{
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
          }}
          label="Drop a PDF, DOCX or TXT to chat with"
        />
      ) : (
        <Card className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col !p-0">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
            <FileText className="h-5 w-5 shrink-0 text-brand-500" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-white">
              {file.name} <span className="font-normal text-slate-400">({formatBytes(file.size)})</span>
            </p>
            <button
              onClick={() => { setFile(null); setMessages([]); }}
              className="text-slate-400 hover:text-rose-500"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <Sparkles className="h-8 w-8 text-brand-400" />
                <p className="text-sm text-slate-400">Ask anything about this document</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="glass rounded-xl px-4 py-2.5 text-left text-xs text-slate-600 transition-colors hover:border-brand-400 dark:text-slate-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white'
                      : 'glass text-slate-700 dark:text-slate-200'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="glass flex items-center gap-1.5 rounded-2xl px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-brand-500"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 dark:border-white/10">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask()}
                placeholder="Ask a question about the document…"
                className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
              <button
                onClick={() => ask()}
                disabled={!input.trim() || loading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg shadow-brand-600/25 transition-all hover:brightness-110 disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}
    </ToolShell>
  );
}
