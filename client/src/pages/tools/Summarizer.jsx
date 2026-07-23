import { useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Copy, Download, X, KeyRound, CalendarDays, Hash, Users,
  Layers, HelpCircle, FileText,
} from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { cn, formatBytes } from '../../lib/utils.js';

const MODES = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'bullets', label: 'Bullets' },
  { value: 'chapters', label: 'Chapter-wise' },
];

const TABS = [
  { id: 'summary', label: 'Summary', icon: Sparkles },
  { id: 'insights', label: 'Insights', icon: KeyRound },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
];

function Flashcard({ card }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((v) => !v)}
      className="glass min-h-32 rounded-2xl p-5 text-left transition-transform hover:scale-[1.01]"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
        {flipped ? 'Answer' : 'Question'} · tap to flip
      </p>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{flipped ? card.back : card.front}</p>
    </button>
  );
}

function QuizQuestion({ q, index }) {
  const [selected, setSelected] = useState(null);
  return (
    <Card>
      <p className="font-semibold text-slate-800 dark:text-white">
        {index + 1}. {q.question}
      </p>
      <div className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answerIndex;
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                'w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                selected === null
                  ? 'border-slate-200 hover:border-brand-400 dark:border-white/10'
                  : isCorrect
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : isSelected
                  ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  : 'border-slate-200 opacity-60 dark:border-white/10'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && q.explanation && (
        <p className="mt-3 rounded-xl bg-brand-500/5 p-3 text-xs text-slate-500 dark:text-slate-400">
          💡 {q.explanation}
        </p>
      )}
    </Card>
  );
}

export default function Summarizer() {
  const [file, setFile] = useState(null);
  const [tab, setTab] = useState('summary');
  const [mode, setMode] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [insights, setInsights] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quiz, setQuiz] = useState(null);

  const makeForm = () => {
    const form = new FormData();
    form.append('file', file);
    return form;
  };

  const runTab = async (targetTab, targetMode = mode) => {
    if (!file) return toast.error('Upload a document first');
    setLoading(true);
    try {
      if (targetTab === 'summary') {
        const form = makeForm();
        form.append('mode', targetMode);
        const { data } = await api.post('/ai/summarize', form);
        setSummary(data.data.summary);
      } else if (targetTab === 'insights') {
        const { data } = await api.post('/ai/insights', makeForm());
        setInsights(data.data.insights);
      } else if (targetTab === 'flashcards') {
        const { data } = await api.post('/ai/flashcards', makeForm());
        setFlashcards(data.data.flashcards);
      } else if (targetTab === 'quiz') {
        const { data } = await api.post('/ai/quiz', makeForm());
        setQuiz(data.data.questions);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied');
  };

  const exportSummary = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'summary.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const insightSections = insights && [
    { title: 'Keywords', icon: KeyRound, items: (insights.keywords || []).map((k) => ({ main: k })) },
    { title: 'Important dates', icon: CalendarDays, items: (insights.dates || []).map((d) => ({ main: d.date, sub: d.context })) },
    { title: 'Important numbers', icon: Hash, items: (insights.numbers || []).map((n) => ({ main: n.value, sub: n.context })) },
    { title: 'People & organizations', icon: Users, items: (insights.people || []).map((p) => ({ main: p.name, sub: p.role })) },
  ];

  return (
    <ToolShell
      icon={Sparkles}
      title="AI Summarizer"
      description="Summaries, insights, flashcards and quizzes from any PDF or DOCX."
    >
      {!file ? (
        <Dropzone
          onFiles={(files) => setFile(files[0])}
          multiple={false}
          accept={{
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
          }}
          label="Drop a PDF, DOCX or TXT"
          sublabel="We'll extract the text and put AI to work"
        />
      ) : (
        <>
          <Card className="flex items-center gap-3 !p-4">
            <FileText className="h-5 w-5 shrink-0 text-brand-500" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-white">
              {file.name} <span className="font-normal text-slate-400">({formatBytes(file.size)})</span>
            </p>
            <button onClick={() => { setFile(null); setSummary(''); setInsights(null); setFlashcards(null); setQuiz(null); }} className="text-slate-400 hover:text-rose-500">
              <X className="h-4 w-4" />
            </button>
          </Card>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  tab === id
                    ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg shadow-brand-600/25'
                    : 'glass text-slate-600 dark:text-slate-300'
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {/* Summary tab */}
          {tab === 'summary' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => { setMode(m.value); runTab('summary', m.value); }}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                      mode === m.value
                        ? 'bg-brand-600 text-white'
                        : 'glass text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <Card className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </Card>
              ) : summary ? (
                <Card>
                  <div className="mb-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={copySummary}>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button variant="secondary" size="sm" onClick={exportSummary}>
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  </div>
                  <div className="prose prose-sm prose-slate max-w-none dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_li]:text-sm [&_p]:text-sm [&_strong]:text-slate-900 dark:[&_strong]:text-white">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </Card>
              ) : (
                <Button onClick={() => runTab('summary')} size="lg" className="w-full">
                  <Sparkles className="h-4 w-4" /> Generate {MODES.find((m) => m.value === mode)?.label} summary
                </Button>
              )}
            </div>
          )}

          {/* Insights tab */}
          {tab === 'insights' &&
            (loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </Card>
                ))}
              </div>
            ) : insights ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {insightSections.map(({ title, icon: Icon, items }) => (
                  <Card key={title}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                      <Icon className="h-4 w-4 text-brand-500" /> {title}
                    </h3>
                    {items.length ? (
                      <ul className="space-y-2">
                        {items.slice(0, 10).map((item, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{item.main}</span>
                            {item.sub && <span className="text-slate-400"> — {item.sub}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">None found</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Button onClick={() => runTab('insights')} size="lg" className="w-full">
                <KeyRound className="h-4 w-4" /> Extract keywords, dates, numbers & people
              </Button>
            ))}

          {/* Flashcards tab */}
          {tab === 'flashcards' &&
            (loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : flashcards ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {flashcards.map((card, i) => (
                  <Flashcard key={i} card={card} />
                ))}
              </div>
            ) : (
              <Button onClick={() => runTab('flashcards')} size="lg" className="w-full">
                <Layers className="h-4 w-4" /> Generate flashcards
              </Button>
            ))}

          {/* Quiz tab */}
          {tab === 'quiz' &&
            (loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : quiz ? (
              <div className="space-y-4">
                {quiz.map((q, i) => (
                  <QuizQuestion key={i} q={q} index={i} />
                ))}
              </div>
            ) : (
              <Button onClick={() => runTab('quiz')} size="lg" className="w-full">
                <HelpCircle className="h-4 w-4" /> Generate quiz
              </Button>
            ))}
        </>
      )}
    </ToolShell>
  );
}
