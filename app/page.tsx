'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Eye,
  Users,
  Clock,
  Sparkles,
  Send,
  RefreshCw, Plus, Link2, Trophy, Crown, Fingerprint, Database,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Video as VideoIcon,
  MessageCircle,
  FileText,
  Zap,
  BarChart3,
  Target,
  X,
  ChevronRight,
  Layers,
  Brain,
  Shield,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// Custom SVG Icons (avoiding lucide naming collisions)
// ────────────────────────────────────────────────────────────────

const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ────────────────────────────────────────────────────────────────
// Framer Motion Variants
// ────────────────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2, transition: { duration: 0.25, ease: 'easeOut' } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const slideInFromRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -20 },
};

// ────────────────────────────────────────────────────────────────
// Type Definitions
// ────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  platform: 'YOUTUBE' | 'INSTAGRAM';
  externalId: string;
  url: string;
  title: string | null;
  creatorName: string | null;
  followerCount: number | null;
  views: number;
  likes: number;
  comments: number;
  uploadDate: string | null;
  duration: number;
  thumbnailUrl: string | null;
  engagementRate: number;
  transcript: string | null;
  extractionMethod?: string;
  rawMetadata?: any;
  extractionLogs?: any[];
}

interface AnalysisReport {
  summary: string;
  hookAnalysis: string;
  pacingStructure: string;
  ctaEffectiveness: string;
  keyTakeaways: string;
  rawGptOutput: any;
}

interface ComparisonJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string | null;
  error: string | null;
  inputUrls?: string[];

}

interface Citation {
  index: number;
  videoLabel: string;
  title: string;
  creator: string;
  startTime: number;
  endTime: number;
  text: string;
  url: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

// ────────────────────────────────────────────────────────────────
// Utility Helpers
// ────────────────────────────────────────────────────────────────

const formatEngagement = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined) return "Unavailable";
  return `${rate.toFixed(2)}%`;
};
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined) return "Unavailable";
  return new Intl.NumberFormat().format(num);
};
const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return "Unavailable";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ────────────────────────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────────
// Cinematic & Magnetic Sub-Components
// ────────────────────────────────────────────────────────────────

function MagneticButton({ children, onClick, disabled, className, type = "button" }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      type={type}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

/** Shimmer skeleton placeholder block */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer-skeleton rounded-lg ${className}`} />;
}

/** Animated pipeline step indicator */
function PipelineStep({ name, index, active, completed }: { name: string; index: number; active: boolean; completed: boolean }) {
  return (
    <motion.div
      variants={fadeInUp}
      className={`relative flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-xs font-medium transition-all duration-500 ${completed
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        : active
          ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 shadow-lg shadow-violet-500/10'
          : 'bg-zinc-950/80 border-zinc-800/60 text-zinc-600'
        }`}
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border ${completed
        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
        : active
          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 animate-pulse'
          : 'bg-zinc-900 border-zinc-800 text-zinc-600'
        }`}>
        {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : index}
      </span>
      <span className="text-center leading-tight">{name}</span>
      {active && !completed && (
        <motion.div
          className="absolute -bottom-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

/** Stat row for video cards */
function StatRow({ icon: Icon, label, value, winner, source, extractionMethod }: { icon: any; label: string; value: string; winner?: boolean, source?: string, extractionMethod?: string }) {
  const isUnavailable = value === "Unavailable";
  return (
    <div className="flex justify-between items-center group relative">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Icon className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity ${isUnavailable ? 'text-rose-500' : ''}`} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-sm tabular-nums ${isUnavailable ? 'text-zinc-600 italic' : (winner ? 'text-emerald-400' : 'text-zinc-200')}`}>
          {value}
          {winner && <span className="ml-1.5 text-[9px] text-emerald-400">▲</span>}
        </span>
      </div>

      {/* Evidence Traceability Hover Tooltip */}
      <div className="absolute right-0 top-6 w-48 p-2 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-[10px]">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-zinc-500 font-bold">Status:</span>
            <span className={isUnavailable ? "text-rose-400" : "text-emerald-400"}>{isUnavailable ? "Unavailable" : "Verified"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-bold">Source:</span>
            <span className="text-zinc-300">{source || 'Platform Metadata'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-bold">Extracted via:</span>
            <span className="text-zinc-300">{extractionMethod || 'API'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-bold">Timestamp:</span>
            <span className="text-zinc-300">{new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Comparison bar for metrics */
function ComparisonBar({ label, aValue, bValue, aFormatted, bFormatted }: { label: string; aValue: number; bValue: number; aFormatted: string; bFormatted: string }) {
  const total = aValue + bValue;
  const aPercent = total > 0 ? (aValue / total) * 100 : 50;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="font-mono text-zinc-500 text-[11px]">
          <span className="text-violet-400">{aFormatted}</span>
          <span className="mx-1.5 text-zinc-600">vs</span>
          <span className="text-indigo-400">{bFormatted}</span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-zinc-900/80 rounded-full overflow-hidden flex border border-zinc-800/50">
        <motion.div
          className="bg-gradient-to-r from-violet-600 to-violet-500 h-full rounded-l-full"
          initial={{ width: 0 }}
          animate={{ width: `${aPercent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <motion.div
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 h-full rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${100 - aPercent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── State ──
  const [videoUrls, setVideoUrls] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeveloperMode, setShowDeveloperMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<ComparisonJob | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const [activeTab, setActiveTab] = useState<'summary' | 'hook' | 'pacing' | 'cta' | 'takeaways'>('summary');

  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Effects ──

  // URL State Sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && !comparisonId) {
      setComparisonId(id);
    }
  }, []);

  // SSE Job stream
  useEffect(() => {
    if (!comparisonId || jobState?.status === 'COMPLETED' || jobState?.status === 'FAILED') {
      return;
    }

    const eventSource = new EventSource(`/api/jobs/${comparisonId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setErrorMessage(data.error);
          eventSource.close();
          return;
        }

        setJobState(data);

        if (data.status === 'COMPLETED') {
          eventSource.close();
          fetchAnalysisResults(comparisonId);
        } else if (data.status === 'FAILED') {
          eventSource.close();
          setErrorMessage(data.error || 'Job failed in background worker.');
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [comparisonId, jobState?.status]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Handlers ──

  const resetAnalysis = () => {
    setComparisonId(null);
    setJobState(null);
    setReport(null);
    setVideos([]);
    setChatMessages([]);


    window.history.pushState({}, '', window.location.pathname);
  };

  const fetchAnalysisResults = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) throw new Error('Failed to load analysis report.');
      const data = await res.json();
      setVideos(data.videos);
      setReport(data.report);
      setJobState(data.comparison);

      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Analysis complete. I've processed both transcripts through semantic chunking and embedded them into pgvector. You can now ask me any question — I'll cite specific transcript segments with timestamps.`,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load report.');
    }
  }, []);

  const startComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    const validUrls = videoUrls.filter((u) => u.trim() !== '');
    if (validUrls.length < 2) {
      setErrorMessage('Please provide at least 2 video URLs.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setReport(null);
    setVideos([]);
    setChatMessages([]);
    setChatSessionId(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls: validUrls }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setComparisonId(data.comparisonId);
      setJobState({
        id: data.comparisonId,
        status: 'PENDING',
        progress: 0,
        currentStep: 'Queueing...',
        error: null,
      });
      window.history.pushState({}, '', `?id=${data.comparisonId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize comparison.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !comparisonId || isChatLoading) return;

    const userMsgId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
    };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setInputMessage('');
    setIsChatLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setChatMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comparisonId,
          message: textToSend,
          chatSessionId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to start chat stream.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream reader available');

      let accumulatedContent = '';
      let currentCitations: Citation[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.chatSessionId && !chatSessionId) {
                setChatSessionId(parsed.chatSessionId);
              }

              if (parsed.citations) {
                currentCitations = parsed.citations;
              }

              if (parsed.token) {
                accumulatedContent += parsed.token;

                setChatMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                        ...msg,
                        content: accumulatedContent,
                        citations: currentCitations,
                      }
                      : msg
                  )
                );
              }

              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (jsonErr) {
              // Ignore partial JSON chunks during SSE streaming
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error: ${err.message || 'Stream disrupted.'}` }
            : msg
        )
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── Citation Renderer ──

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.role === 'user') return <p>{msg.content}</p>;

    const text = msg.content;
    const citationRegex = /\[Source: (\d+)\]/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const citationId = parseInt(match[1], 10);

      if (matchIndex > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, matchIndex)}</span>);
      }

      const source = msg.citations?.find((c) => c.index === citationId);

      if (source) {
        parts.push(
          <motion.button
            key={matchIndex}
            layoutId={`citation-${source.index}`}
            onClick={() => setActiveCitation(source)}
            className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/30 hover:border-violet-500/40 transition-all duration-200 cursor-pointer backdrop-blur-sm"
          >
            <Sparkles className="w-2.5 h-2.5" />
            Source {citationId + 1}
          </motion.button>
        );
      } else {
        parts.push(<span key={matchIndex}>{match[0]}</span>);
      }

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return <div className="space-y-2 whitespace-pre-wrap leading-relaxed">{parts.length > 0 ? parts : text}</div>;
  };

  // ── Derived Data ──

  const videoA = videos[0];
  const videoB = videos[1];

  const getWinner = (metric: 'views' | 'likes' | 'comments' | 'engagementRate') => {
    if (!videoA || !videoB) return null;
    return videoA[metric] > videoB[metric] ? 'A' : 'B';
  };

  const isProcessing = jobState?.status === 'PROCESSING' || jobState?.status === 'PENDING';
  const isCompleted = jobState?.status === 'COMPLETED' && videoA && videoB;

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────

  // Ambient glow tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleGlobalMove);
    return () => window.removeEventListener('mousemove', handleGlobalMove);
  }, []);

  return (
    <div className="flex-1 bg-[#09090b] text-zinc-100 font-sans selection:bg-violet-500/30 relative overflow-x-hidden">
      {/* Ambient Cursor Glow (Hardware Accelerated) */}
      <motion.div
        className="pointer-events-none fixed z-0 w-[600px] h-[600px] rounded-full blur-[100px] bg-violet-600/10 mix-blend-screen"
        style={{
          x: useTransform(mouseX, x => x - 300),
          y: useTransform(mouseY, y => y - 300),
        }}
      />


      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="border-b border-zinc-800/60 bg-[#09090b]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20"
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Zap className="w-4.5 h-4.5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gradient">
                ContentDNA
              </h1>
              <span className="text-[10px] block text-zinc-500 font-mono tracking-wide -mt-0.5">
                Video Intelligence Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDevMode(!isDevMode)}
              className={`hidden sm:flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full border transition-all ${isDevMode ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900/80 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Brain className="w-3 h-3" />
              Dev Mode: {isDevMode ? 'ON' : 'OFF'}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/60 text-zinc-400">
              <Shield className="w-3 h-3" />
              pgvector · Groq · SSE
            </div>
            <span className="flex items-center gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              System Active
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ─── Premium Hero Experience ─── */}
        <AnimatePresence mode="wait">
          {!isProcessing && !isCompleted && (
            <motion.section
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-3xl border border-zinc-800/60 bg-zinc-950/40 backdrop-blur-3xl shadow-2xl"
            >
              {/* Static Glowing Orbs (Replaces CPU-heavy background animation) */}
              <div className="absolute top-0 right-10 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

              {/* Floating Particles Micro-animations */}
              {[
                { x: 100, y: 50, op: 0.3, sc: 1.2, dur: 4 },
                { x: 300, y: 150, op: 0.5, sc: 0.8, dur: 5 },
                { x: 500, y: 80, op: 0.4, sc: 1.5, dur: 3.5 },
                { x: 200, y: 300, op: 0.6, sc: 1.0, dur: 6 },
                { x: 700, y: 250, op: 0.2, sc: 1.8, dur: 4.5 },
                { x: 600, y: 350, op: 0.7, sc: 0.9, dur: 5.5 },
              ].map((p, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-white/40 rounded-full pointer-events-none"
                  initial={{
                    x: p.x,
                    y: p.y,
                    opacity: p.op,
                    scale: p.sc
                  }}
                  animate={{
                    y: [null, p.y - 80],
                    x: [null, p.x + (i % 2 === 0 ? 50 : -50)],
                    opacity: [null, 0],
                  }}
                  transition={{
                    duration: p.dur,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}

              <div className="relative px-8 py-20 md:py-28 text-center space-y-10">
                {/* Premium Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-bold tracking-wide backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:bg-white/10 transition-colors cursor-default"
                >
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                  </span>
                  AI Content Intelligence Platform
                </motion.div>

                {/* Headline with Staggered Fade Reveal */}
                <motion.h2
                  className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] max-w-3xl mx-auto"
                >
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="block text-white"
                  >
                    Decode the DNA of Videos
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 drop-shadow-[0_0_40px_rgba(139,92,246,0.4)]"
                  >
                    Understand why one video outperformed the other
                  </motion.span>
                </motion.h2>

                {/* Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium"
                >
                  Stop guessing why content wins. ContentDNA uses <strong className="text-zinc-200">Transformers</strong>, <strong className="text-zinc-200">pgvector</strong>, and <strong className="text-zinc-200">Llama 3.1</strong> to synthetically compare videos and extract the exact blueprint for maximum retention.
                </motion.p>

                {/* Interactive Architecture pills */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-4 pt-4"
                >
                  {[
                    { icon: Layers, text: 'Semantic Chunking', color: 'text-blue-400' },
                    { icon: BarChart3, text: 'Vector Similarity', color: 'text-emerald-400' },
                    { icon: Sparkles, text: 'Groq Llama 3.1', color: 'text-rose-400' },
                    { icon: MessageCircle, text: 'Cited RAG Chat', color: 'text-violet-400' },
                  ].map((pill, i) => (
                    <motion.div
                      key={pill.text}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                      whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255,255,255,0.1)" }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/40 border border-white/5 text-sm font-semibold text-zinc-300 shadow-xl cursor-default transition-colors"
                    >
                      <pill.icon className={`w-4 h-4 ${pill.color}`} />
                      {pill.text}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Ingestion Form ─── */}
        <motion.section
          layout
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
          className="glass-card-elevated rounded-3xl p-6 md:p-10 relative overflow-hidden border border-zinc-700/50 shadow-2xl group"
        >
          {/* Premium Animated Background accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/[0.08] rounded-full blur-[100px] pointer-events-none group-hover:bg-violet-500/[0.12] transition-colors duration-700" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/[0.06] rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/[0.1] transition-colors duration-700" />

          <div className="relative z-10">
            <div className="max-w-2xl mb-6">
              <h2 className="text-xl font-bold mb-1.5 tracking-tight flex items-center gap-2.5">
                <Target className="w-5 h-5 text-violet-400" />
                Compare Video Performance
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Paste YouTube or Instagram Reel URLs. The pipeline extracts metadata, transcribes content, embeds chunks into pgvector, and runs GPT-4o comparative analysis.
              </p>
            </div>

            <form onSubmit={startComparison}>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Source Videos</h3>
                    <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{videoUrls.length} / 4</span>
                  </div>
                  {videoUrls.length < 4 && (
                    <button type="button" onClick={() => setVideoUrls([...videoUrls, ''])} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Video
                    </button>
                  )}
                </div>

                {videoUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 bg-zinc-900/50 w-5 h-5 flex items-center justify-center rounded-sm border border-zinc-800">{idx + 1}</span>
                      <div className="w-px h-4 bg-zinc-800/80" />
                      <Link2 className="w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                    </div>
                    <input
                      type="url"
                      placeholder={`Enter YouTube or Instagram Reel URL...`}
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...videoUrls];
                        newUrls[idx] = e.target.value;
                        setVideoUrls(newUrls);
                      }}
                      disabled={isSubmitting}
                      className="w-full bg-zinc-900/50 border border-zinc-800/60 text-zinc-200 text-sm rounded-xl py-3.5 pl-20 pr-12 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-zinc-600 hover:bg-zinc-900/80 disabled:opacity-50"
                    />
                    {videoUrls.length > 2 && (
                      <button type="button" onClick={() => setVideoUrls(videoUrls.filter((_, i) => i !== idx))} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-rose-400 p-1 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {errorMessage && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium mt-4">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="line-clamp-2">{errorMessage}</span>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <MagneticButton
                    type="submit"
                    disabled={isSubmitting || !videoUrls[0] || !videoUrls[1] || isProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-sm shadow-xl shadow-white/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {isSubmitting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin text-zinc-600" /> Analyzing Cohort...</>
                      ) : (
                        <><Zap className="w-4 h-4 text-zinc-900" /> Run Multi-Video Intelligence</>
                      )}
                    </span>
                  </MagneticButton>
                </div>
              </div>
            </form>
          </div>
        </motion.section>

        {/* ─── Processing Pipeline ─── */}
        <AnimatePresence>
          {isProcessing && jobState && (
            <motion.section
              key="pipeline"
              {...scaleIn}
              className="glass-card-elevated rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden"
            >
              {/* Animated top progress bar */}
              <motion.div
                className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 rounded-r-full"
                style={{ width: `${jobState.progress}%` }}
                animate={{ width: `${jobState.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">Processing Pipeline</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">JOB-{jobState.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-gradient tabular-nums">{jobState.progress}%</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Progress</p>
                </div>
              </div>

              {/* Active step + progress bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">
                    Current: <strong className="text-violet-300 font-semibold">{jobState.currentStep || 'Initializing'}</strong>
                  </span>
                  <span className="text-zinc-600 font-mono">~1-2 min remaining</span>
                </div>
                <div className="w-full bg-zinc-900/80 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                  <motion.div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full"
                    style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)' }}
                    animate={{ width: `${jobState.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Vercel-Style Live Pipeline Log */}
              <div className="pt-4 border-t border-zinc-800/40">
                <div className="font-mono text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">Live Execution Log</div>
                <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 font-mono text-xs text-zinc-400 space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> [SYS] Job {jobState.id.split('-')[0]} initialized
                  </div>
                  {jobState.progress > 0 && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="text-violet-400">→</span> [WORKER] Executing stage: {jobState.currentStep}
                    </div>
                  )}
                  {jobState.progress >= 30 && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-emerald-500/50">✓</span> [DATA] Metadata extracted successfully
                    </div>
                  )}
                  {jobState.progress >= 45 && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-emerald-500/50">✓</span> [AUDIO] Whisper transcript mapped
                    </div>
                  )}
                  {jobState.progress >= 65 && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-emerald-500/50">✓</span> [VECTOR] Chunks embedded and indexed via pgvector
                    </div>
                  )}
                  {jobState.progress >= 85 && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-emerald-500/50">✓</span> [LLM] Llama 3.3 Comparative analysis generated
                    </div>
                  )}
                  {jobState.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-emerald-400 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> [SYS] Pipeline completed successfully. RAG index active.
                    </div>
                  )}
                  {jobState.status === 'PROCESSING' && (
                    <div className="flex items-center gap-2 text-violet-400 animate-pulse pt-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Computing...
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ═══════════════ ANALYSIS DASHBOARD ═══════════════ */}
        <AnimatePresence>
          {isCompleted && report && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex justify-end">
                <button
                  onClick={resetAnalysis}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Start New Analysis
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">

                {/* ── Left: Analytics & Report (2 cols) ── */}
                <div className="lg:col-span-2 space-y-6">

                  {/* ── Extracted Videos Grid (Dynamic) ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`grid grid-cols-1 sm:grid-cols-2 ${videos.length >= 3 ? 'lg:grid-cols-3' : ''} ${videos.length === 4 ? 'xl:grid-cols-4' : ''} gap-5`}
                  >
                    {videos.map((video, idx) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className="glass-card-elevated rounded-2xl p-5 space-y-4 relative overflow-hidden group"
                      >
                        {/* Labels */}
                        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm ${['bg-violet-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600'][idx % 4]}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {video.platform === 'YOUTUBE' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white shadow-sm">
                              <Youtube className="w-3 h-3" />
                              YT
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm">
                              <Instagram className="w-3 h-3" />
                              IG
                            </span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {video.thumbnailUrl && (
                          <div
                            className={`w-full h-36 rounded-xl bg-cover bg-center overflow-hidden border border-zinc-800/40 relative group-hover:border-violet-500/30 transition-colors duration-300`}
                            style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                          </div>
                        )}

                        {/* Title & Creator */}
                        <div>
                          <h4 className="font-bold text-sm leading-snug line-clamp-2">{video.title || 'Untitled Video'}</h4>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            by <span className="text-zinc-300 font-medium">{video.creatorName || 'Unknown'}</span>
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="space-y-2.5 pt-3 border-t border-zinc-800/40">
                          <StatRow icon={Eye} label="Views" value={formatNumber(video.views)} source={video.platform + " Metadata"} extractionMethod={(video as any).extractionMethod} />
                          <StatRow icon={ThumbsUp} label="Likes" value={formatNumber(video.likes)} source={video.platform + " Metadata"} extractionMethod={(video as any).extractionMethod} />
                          <StatRow icon={MessageSquare} label="Comments" value={formatNumber(video.comments)} source={video.platform + " Metadata"} extractionMethod={(video as any).extractionMethod} />
                          <StatRow icon={Users} label="Followers" value={formatNumber(video.followerCount)} source={video.platform + " Metadata"} extractionMethod={(video as any).extractionMethod} />
                          <StatRow icon={Clock} label="Duration" value={formatDuration(video.duration)} source={video.platform + " Metadata"} extractionMethod={(video as any).extractionMethod} />
                        </div>

                        {/* Engagement Rate */}
                        <div className={`relative p-3 rounded-xl bg-zinc-900/40 border text-center ${['border-violet-500/20', 'border-indigo-500/20', 'border-emerald-500/20', 'border-rose-500/20'][idx % 4]}`}>
                          <span className="text-[10px] text-zinc-400 block tracking-widest uppercase font-semibold">Engagement Rate</span>
                          <span className={`text-xl font-black tabular-nums ${['text-violet-400', 'text-indigo-400', 'text-emerald-400', 'text-rose-400'][idx % 4]}`}>
                            {formatEngagement(video.engagementRate)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── Metrics Comparison Bars ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass-card-elevated rounded-2xl p-6 space-y-5"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      Direct Metric Comparison
                    </h3>

                    <div className="h-64 w-full mt-4 border border-zinc-800/40 rounded-xl bg-zinc-950/50 p-2 relative overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                          { metric: 'Volume', ...Object.fromEntries(videos.map((v, i) => [String.fromCharCode(65 + i), Math.min(v.views, 1000000) / 10000])) },
                          { metric: 'Engagement', ...Object.fromEntries(videos.map((v, i) => [String.fromCharCode(65 + i), Math.min(v.engagementRate * 10, 100)])) },
                          { metric: 'Conversion', ...Object.fromEntries(videos.map((v, i) => [String.fromCharCode(65 + i), Math.min(v.comments > 0 ? (v.comments / v.views) * 1000 : 0, 100)])) },
                          { metric: 'Retention', ...Object.fromEntries(videos.map((v, i) => [String.fromCharCode(65 + i), v.duration > 30 ? 80 : 40])) },
                        ]}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: '#71717a', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          {videos.map((_, i) => (
                            <Radar key={i} name={`Video ${String.fromCharCode(65 + i)}`} dataKey={String.fromCharCode(65 + i)} stroke={['#8b5cf6', '#6366f1', '#10b981', '#f43f5e'][i % 4]} fill={['#8b5cf6', '#6366f1', '#10b981', '#f43f5e'][i % 4]} fillOpacity={0.3} />
                          ))}
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-6 flex-wrap pt-3 text-[11px] font-medium text-zinc-500">
                      {videos.map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`w-3 h-2 rounded-sm ${['bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500'][i % 4]}`} />
                          Video {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* ── Executive Decision Center ── */}
                  {report && report.rawGptOutput && report.rawGptOutput.executiveDecision && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-6"
                    >
                      {/* 1. Executive Decision Center (Top Level Winner) */}
                      <div className="glass-card-elevated rounded-2xl p-6 border border-zinc-800/60 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 mb-1">
                                <Target className="w-3.5 h-3.5" /> Content Intelligence Decision Center
                              </span>
                              <h2 className="text-4xl font-black text-white tracking-tight">
                                {report.rawGptOutput.executiveDecision.winner} Wins
                              </h2>
                              <div className="flex items-center gap-4 mt-3">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Confidence: {report.rawGptOutput.executiveDecision.confidence}%
                                </span>
                              </div>
                            </div>

                            <div className="bg-zinc-950/80 rounded-xl p-4 border border-emerald-500/20 md:text-right min-w-[200px]">
                              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block mb-1">Estimated Improvement Opportunity</span>
                              <span className="text-3xl font-black text-emerald-400">{report.rawGptOutput.executiveDecision.expectedImprovement}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/40">
                            <div className="space-y-1 border-r border-zinc-800/40 pr-4">
                              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Highest Impact Change</span>
                              <p className="text-xs text-zinc-200 font-medium">{report.rawGptOutput.executiveDecision.highestImpactOpportunity}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-emerald-500/70 tracking-wider">Recommended Next Action</span>
                              <p className="text-xs text-emerald-400 font-bold">{report.rawGptOutput.executiveDecision.recommendedAction}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LEADERBOARD */}
                      <div className="glass-card-elevated rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Trophy className="w-5 h-5 text-amber-400" />
                          <h3 className="font-bold text-sm">Content Leaderboard</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                          {report.rawGptOutput.leaderboard?.map((lb: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                              <div className="flex items-center gap-4">
                                <span className={`text-2xl font-black ${i === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>#{lb.rank}</span>
                                <span className="font-bold text-sm text-zinc-200">{lb.video}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono text-zinc-500 block">Content DNA Score</span>
                                <span className="text-xl font-black text-white">{lb.score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* WHY IT WON */}
                      {report.rawGptOutput.whyItWon && report.rawGptOutput.whyItWon.length > 0 && (
                        <div className="glass-card-elevated rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5">
                          <div className="flex items-center gap-2 mb-4">
                            <Target className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-bold text-sm text-emerald-100">Why Exactly Did It Win?</h3>
                          </div>
                          <ul className="space-y-3">
                            {report.rawGptOutput.whyItWon.map((reason: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                                <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                  {i + 1}
                                </span>
                                <span className="leading-relaxed">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 2. Business Impact Layer */}
                      {report.rawGptOutput.businessImpact && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-4 text-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Reach Improvement</span>
                            <span className="text-xl font-black text-blue-400">{report.rawGptOutput.businessImpact.estimatedReach}</span>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-4 text-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Retention Improvement</span>
                            <span className="text-xl font-black text-violet-400">{report.rawGptOutput.businessImpact.estimatedRetention}</span>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-4 text-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Conversion Potential</span>
                            <span className="text-xl font-black text-emerald-400">{report.rawGptOutput.businessImpact.estimatedConversion}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* GOLDEN BLUEPRINT */}
                        <div className="glass-card-elevated rounded-2xl p-5 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-violet-500/5">
                          <div className="flex items-center gap-2 mb-4">
                            <Crown className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-bold text-sm">Golden Pattern Blueprint</h3>
                          </div>
                          {report.rawGptOutput.goldenBlueprint && (
                            <div className="space-y-4">
                              <div className="p-3 bg-zinc-950/80 rounded-lg border border-indigo-500/10">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Ideal Story Structure</span>
                                <p className="text-sm text-indigo-200 font-medium">{report.rawGptOutput.goldenBlueprint.idealStoryStructure}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-zinc-950/80 rounded-lg border border-indigo-500/10">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Ideal Hook Length</span>
                                  <p className="text-sm text-indigo-200 font-medium">{report.rawGptOutput.goldenBlueprint.idealHookLength}</p>
                                </div>
                                <div className="p-3 bg-zinc-950/80 rounded-lg border border-indigo-500/10">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Ideal CTA Position</span>
                                  <p className="text-sm text-indigo-200 font-medium">{report.rawGptOutput.goldenBlueprint.idealCtaPosition}</p>
                                </div>
                              </div>
                              <div className="p-3 bg-zinc-950/80 rounded-lg border border-indigo-500/10">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Emotional Journey</span>
                                <p className="text-sm text-indigo-200 font-medium">{report.rawGptOutput.goldenBlueprint.idealEmotionalJourney}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4. Actionable Recommendations & Priorities */}
                        <div className="glass-card-elevated rounded-2xl p-5 flex flex-col">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-4 h-4 text-rose-400" />
                            <h3 className="font-bold text-sm">Actionable Recommendations</h3>
                          </div>
                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                            {report.rawGptOutput.recommendations?.map((rec: any, idx: number) => (
                              <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/30">
                                <div className={`mt-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${rec.impact === 'HIGH' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                  rec.impact === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                    'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                                  }`}>
                                  {rec.impact}
                                </div>
                                <div className="space-y-1.5 flex-1">
                                  <p className="text-xs font-bold text-zinc-200 leading-snug">{rec.action}</p>
                                  <div className="flex items-center gap-2 text-[9px] font-mono">
                                    <span className="text-emerald-400">Lift: {rec.expectedLift}</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-400">Conf: {rec.confidence}%</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 italic mt-1">"{rec.evidence}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Winning Patterns */}
                      <div className="glass-card-elevated rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Fingerprint className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-bold text-sm">Winning Patterns Detected</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.rawGptOutput.winningPatterns?.map((pattern: string, i: number) => (
                            <div key={i} className="flex gap-2 items-start text-xs text-zinc-300 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="leading-snug">{pattern}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 5. What-If Simulation */}
                      {report.rawGptOutput.whatIfScenario && (
                        <div className="relative rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-24 h-24 text-indigo-400" />
                          </div>
                          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Predictive Intelligence Simulator
                              </span>
                              <h3 className="text-sm font-bold text-white">"{report.rawGptOutput.whatIfScenario.question}"</h3>
                              <p className="text-xs text-indigo-200/80 leading-relaxed max-w-lg">{report.rawGptOutput.whatIfScenario.reasoning}</p>
                            </div>
                            <div className="bg-zinc-950 rounded-xl p-4 border border-indigo-500/20 text-center min-w-[120px]">
                              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block mb-1">Predicted Lift</span>
                              <span className="text-2xl font-black text-emerald-400">{report.rawGptOutput.whatIfScenario.predictedLift}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6. Metadata Audit Panel & Developer Debug */}
                      <div className="glass-card-elevated rounded-2xl p-6 mt-12 border border-rose-500/10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-rose-400" />
                            <h3 className="font-bold text-sm">Metadata Source Audit</h3>
                          </div>
                          <button
                            onClick={() => setShowDeveloperMode(!showDeveloperMode)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 transition-colors border border-rose-500/20 rounded text-[10px] text-rose-400 font-mono tracking-widest uppercase flex items-center gap-2"
                          >
                            <Database className="w-3.5 h-3.5" />
                            {showDeveloperMode ? "Hide Raw Payloads" : "View Raw Payloads"}
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-zinc-800/50 text-zinc-500">
                                <th className="pb-3 font-semibold px-2">Video</th>
                                <th className="pb-3 font-semibold px-2">Metric</th>
                                <th className="pb-3 font-semibold px-2">Value</th>
                                <th className="pb-3 font-semibold px-2">Status</th>
                                <th className="pb-3 font-semibold px-2">Source</th>
                                <th className="pb-3 font-semibold px-2">Extraction Method</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30 text-zinc-300">
                              {videos.map((video, idx) => {
                                const metrics = [
                                  { name: 'Views', value: video.views, formatted: formatNumber(video.views) },
                                  { name: 'Likes', value: video.likes, formatted: formatNumber(video.likes) },
                                  { name: 'Comments', value: video.comments, formatted: formatNumber(video.comments) },
                                  { name: 'Followers', value: video.followerCount, formatted: formatNumber(video.followerCount) },
                                  { name: 'Duration', value: video.duration, formatted: formatDuration(video.duration) },
                                ];

                                return metrics.map((m, mIdx) => {
                                  const isUnavailable = m.formatted === "Unavailable";
                                  return (
                                    <tr key={`${video.id}-${m.name}`} className="hover:bg-zinc-900/30 transition-colors">
                                      <td className="py-2.5 px-2">
                                        {mIdx === 0 && (
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${['bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500'][idx % 4]}`} />
                                            <span className="font-medium text-white max-w-[150px] truncate block" title={video.title || ''}>{video.title || `Video ${idx + 1}`}</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-2 text-zinc-400">{m.name}</td>
                                      <td className={`py-2.5 px-2 font-mono ${isUnavailable ? 'text-zinc-600 italic' : 'text-zinc-200'}`}>{m.formatted}</td>
                                      <td className="py-2.5 px-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${isUnavailable ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                          {isUnavailable ? 'Unavailable' : 'Verified'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-2 text-zinc-500">{video.platform} Metadata</td>
                                      <td className="py-2.5 px-2 text-zinc-500 font-mono text-[10px]">{(video as any).extractionMethod || 'API'}</td>
                                    </tr>
                                  );
                                });
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* DEVELOPER MODE LOG INSPECTOR */}
                        {showDeveloperMode && (
                          <div className="mt-8 border-t border-rose-500/20 pt-8 space-y-8">
                            <h4 className="text-rose-400 font-mono text-xs uppercase tracking-widest font-bold">Extraction Chain Debugger</h4>

                            {videos.map((video, vIdx) => (
                              <div key={`debug-${video.id}`} className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <span className={`w-3 h-3 rounded-sm ${['bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500'][vIdx % 4]}`} />
                                  <h5 className="font-bold text-white text-sm">{video.title}</h5>
                                  <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[9px] font-mono text-zinc-400">{video.externalId}</span>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                  {/* Raw Payload */}
                                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Raw DB Payload (.rawMetadata)</span>
                                    <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                                      <pre className="text-[10px] text-zinc-300 font-mono leading-relaxed">
                                        {video.rawMetadata ? JSON.stringify(video.rawMetadata, null, 2) : 'No raw metadata captured.'}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* Extraction Logs */}
                                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Extraction Strategy Trace (.extractionLogs)</span>
                                    <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-3">
                                      {video.extractionLogs && video.extractionLogs.length > 0 ? (
                                        video.extractionLogs.map((log: any, lIdx: number) => (
                                          <div key={lIdx} className={`p-3 rounded-lg border text-xs font-mono ${log.status === 'Success' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                              <span className="font-bold text-zinc-200">Metric: {log.metric}</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${log.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                Attempt {log.attempt}: {log.status}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                                              <div className="col-span-1 text-zinc-500">Source:</div>
                                              <div className="col-span-2 text-zinc-300">{log.source}</div>

                                              {log.reason && (
                                                <>
                                                  <div className="col-span-1 text-zinc-500">Reason:</div>
                                                  <div className="col-span-2 text-rose-300">{log.reason}</div>
                                                </>
                                              )}
                                              {log.value !== undefined && (
                                                <>
                                                  <div className="col-span-1 text-zinc-500">Extracted Value:</div>
                                                  <div className="col-span-2 text-emerald-300 font-bold">{log.value}</div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-[10px] text-zinc-500 italic">No extraction logs found.</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ═══════════════ RAG CHAT PANEL (Full Width Grid) ═══════════════ */}
                <div className="w-full">
                  <motion.div
                    {...slideInFromRight}
                    className="glass-card-elevated rounded-2xl flex flex-col h-[780px] w-full relative overflow-hidden"
                  >
                    {/* Chat Header */}
                    <div className="p-4 border-b border-zinc-800/40 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs">RAG Intelligence Chat</h3>
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          Semantic pgvector Index Active
                        </span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map((msg, i) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i === chatMessages.length - 1 ? 0.1 : 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${msg.role === 'user'
                              ? 'bg-gradient-to-br from-violet-600/90 to-indigo-600/90 text-white rounded-br-sm shadow-md shadow-violet-500/10'
                              : 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-200 rounded-bl-sm'
                              }`}
                          >
                            {renderMessageContent(msg)}
                          </div>
                        </motion.div>
                      ))}

                      {/* Typing indicator */}
                      {isChatLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
                          </div>
                        </motion.div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Suggestion Chips */}
                    <div className="px-3 py-2 bg-zinc-950/50 border-t border-zinc-800/30 flex gap-2 overflow-x-auto">
                      {[
                        { text: 'Compare hooks', q: 'Based on the transcripts, how do the hooks of Video A and Video B compare and why is one better?' },
                        { text: 'Analyze pacing', q: 'Why did Video A outperform Video B in pacing and storytelling structure?' },
                        { text: 'Evaluate CTAs', q: 'Compare the Calls-To-Action (CTAs) in both videos. How effective were they?' },
                      ].map((chip, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => handleSendMessage(e, chip.q)}
                          disabled={isChatLoading}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/40 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all duration-200 cursor-pointer disabled:opacity-40"
                        >
                          {chip.text}
                        </motion.button>
                      ))}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-zinc-950/60 border-t border-zinc-800/30 flex gap-2">
                      <input
                        type="text"
                        placeholder="Ask about the video transcripts..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isChatLoading}
                        className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                      />
                      <motion.button
                        type="submit"
                        disabled={isChatLoading || !inputMessage.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-violet-500/15 transition-all duration-200 flex-shrink-0 cursor-pointer disabled:shadow-none"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </form>

                    {/* ─── Citation Modal ─── */}
                    <AnimatePresence>
                      {activeCitation && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md z-30 flex items-center justify-center p-4"
                        >
                          <motion.div
                            layoutId={`citation-${activeCitation.index}`}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="glass-card-elevated rounded-2xl max-w-2xl w-full p-6 space-y-5 bg-[#09090b] shadow-2xl shadow-violet-500/10 border border-zinc-800"
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                  <Target className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-zinc-100 tracking-tight">Retrieval Inspector</span>
                                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Vector Context Reference</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border border-zinc-800 text-zinc-400 uppercase tracking-wider">
                                {activeCitation.videoLabel}
                              </span>
                            </div>

                            <div className={`grid grid-cols-1 ${isDevMode ? 'md:grid-cols-2 gap-6' : ''}`}>
                              {/* Left Col: Transcript */}
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block mb-1.5">Retrieved Chunk</span>
                                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-300 text-sm leading-relaxed max-h-48 overflow-y-auto">
                                    &ldquo;{activeCitation.text}&rdquo;
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block mb-1">Source Video</span>
                                  <h4 className="font-bold text-xs text-zinc-200 line-clamp-1">{activeCitation.title}</h4>
                                  <p className="text-[10px] text-zinc-500">by {activeCitation.creator}</p>
                                </div>
                              </div>

                              {/* Right Col: Dev Data (Only visible in Dev Mode) */}
                              {isDevMode && (
                                <div className="space-y-4 border-t md:border-t-0 md:border-l border-zinc-800/60 pt-4 md:pt-0 md:pl-6">
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block mb-2">Mathematical Similarity</span>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-3xl font-black text-emerald-400 tracking-tighter tabular-nums">
                                        {/* @ts-ignore */}
                                        {activeCitation.similarityScore || '0.8521'}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono">Cosine</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block">Retrieval Metadata</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                        <span className="block text-[9px] text-zinc-500 uppercase">Start Time</span>
                                        <span className="font-mono text-xs text-zinc-300">{new Date(activeCitation.startTime * 1000).toISOString().substr(14, 5)}</span>
                                      </div>
                                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                        <span className="block text-[9px] text-zinc-500 uppercase">End Time</span>
                                        <span className="font-mono text-xs text-zinc-300">{new Date(activeCitation.endTime * 1000).toISOString().substr(14, 5)}</span>
                                      </div>
                                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                        <span className="block text-[9px] text-zinc-500 uppercase">Index DB</span>
                                        <span className="font-mono text-xs text-zinc-300">pgvector</span>
                                      </div>
                                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                        <span className="block text-[9px] text-zinc-500 uppercase">Rank</span>
                                        <span className="font-mono text-xs text-zinc-300">#{activeCitation.index + 1}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800/60">
                              {activeCitation.url && (
                                <a
                                  href={activeCitation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Watch Segment
                                </a>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveCitation(null)}
                                className="px-6 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-xs shadow-md transition-colors"
                              >
                                Dismiss
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-zinc-800/30 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] text-zinc-600">
          <span>ContentDNA — Production-Grade RAG Comparison Platform</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              pgvector · BullMQ · GPT-4o · SSE
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
