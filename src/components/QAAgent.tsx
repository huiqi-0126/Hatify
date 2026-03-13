import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, RefreshCw, Sparkles, Copy, Check,
  ChevronDown, ExternalLink, Trash2, MessageSquare,
  Database, Zap, Globe, Filter, ArrowLeft
} from "lucide-react";

interface Question {
  id: number;
  platform: string;
  url: string;
  title: string;
  description: string;
  answer_count: number;
  relevance_score: number;
  matched_tags: string[];
  status: string;
  created_at: string;
}

interface Answer {
  id: number;
  question_id: number;
  content: string;
  sources: string[];
  language: string;
  status: string;
  created_at: string;
  question_title: string;
  platform: string;
  question_url: string;
}

interface Stats {
  totalQuestions: number;
  newQuestions: number;
  draftAnswers: number;
  approvedAnswers: number;
  zhihuCount: number;
  quoraCount: number;
  redditCount: number;
  kbChunks: number;
}

export default function QAAgent({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "answers">("questions");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<Answer | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/qa/stats");
      const data = await res.json();
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      const res = await fetch(`/api/qa/questions?${params}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch { /* ignore */ }
  }, [statusFilter, platformFilter]);

  const fetchAnswers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/qa/answers?${params}`);
      const data = await res.json();
      setAnswers(data.answers || []);
    } catch { /* ignore */ }
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
    fetchQuestions();
    fetchAnswers();
  }, [fetchStats, fetchQuestions, fetchAnswers]);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 4000);
  };

  const handleCollect = async (platform = "all") => {
    setLoading(true);
    showAction("⏳ Collecting questions...");
    try {
      await fetch("/api/qa/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      showAction("✅ Collection complete!");
      fetchStats();
      fetchQuestions();
    } catch {
      showAction("❌ Collection failed");
    }
    setLoading(false);
  };

  const handleGenerate = async (questionId: number) => {
    setLoading(true);
    showAction("⏳ Generating answer...");
    try {
      await fetch("/api/qa/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId }),
      });
      showAction("✅ Answer generated!");
      fetchAnswers();
      fetchQuestions();
      fetchStats();
    } catch {
      showAction("❌ Generation failed");
    }
    setLoading(false);
  };

  const handleBuildKB = async () => {
    setLoading(true);
    showAction("⏳ Rebuilding knowledge base...");
    try {
      await fetch("/api/qa/build-kb", { method: "POST" });
      showAction("✅ Knowledge base rebuilt!");
      fetchStats();
    } catch {
      showAction("❌ KB rebuild failed");
    }
    setLoading(false);
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      await fetch(`/api/qa/questions/${id}`, { method: "DELETE" });
      fetchQuestions();
      fetchStats();
    } catch { /* ignore */ }
  };

  const handleSkipQuestion = async (id: number) => {
    try {
      await fetch(`/api/qa/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });
      fetchQuestions();
      fetchStats();
    } catch { /* ignore */ }
  };

  const handleUpdateAnswer = async (id: number, content?: string, status?: string) => {
    try {
      await fetch(`/api/qa/answers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, status }),
      });
      fetchAnswers();
      fetchStats();
      if (status === "approved") showAction("✅ Answer approved!");
    } catch { /* ignore */ }
  };

  const handleCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    drafting: "bg-amber-100 text-amber-700",
    answered: "bg-emerald-100 text-emerald-700",
    skipped: "bg-zinc-100 text-zinc-500",
    draft: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    published: "bg-purple-100 text-purple-700",
  };

  const platformIcons: Record<string, string> = {
    zhihu: "🔵",
    quora: "🔴",
    reddit: "🟠",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-slate-100 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-zinc-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
                Q&A Agent
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Smart community question collection & answer generation</p>
            </div>
          </div>
          <AnimatePresence>
            {actionMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium shadow-lg"
              >
                {actionMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {[
              { label: "KB Chunks", value: stats.kbChunks, icon: Database, color: "text-indigo-600" },
              { label: "Total Q", value: stats.totalQuestions, icon: MessageSquare, color: "text-zinc-700" },
              { label: "New", value: stats.newQuestions, icon: Zap, color: "text-blue-600" },
              { label: "Drafts", value: stats.draftAnswers, icon: Sparkles, color: "text-amber-600" },
              { label: "Approved", value: stats.approvedAnswers, icon: Check, color: "text-emerald-600" },
              { label: "Zhihu", value: stats.zhihuCount, icon: Globe, color: "text-blue-500" },
              { label: "Quora", value: stats.quoraCount, icon: Globe, color: "text-red-500" },
              { label: "Reddit", value: stats.redditCount, icon: Globe, color: "text-orange-500" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleBuildKB}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Rebuild KB
          </button>
          <button
            onClick={() => handleCollect("zhihu")}
            disabled={loading}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Collect Zhihu
          </button>
          <button
            onClick={() => handleCollect("quora")}
            disabled={loading}
            className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Collect Quora
          </button>
          <button
            onClick={() => handleCollect("reddit")}
            disabled={loading}
            className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Collect Reddit
          </button>
          <button
            onClick={() => handleCollect("all")}
            disabled={loading}
            className="px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Collect All
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6 w-fit">
          {(["questions", "answers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setStatusFilter("all"); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab === "questions" ? `Questions (${questions.length})` : `Answers (${answers.length})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm"
            >
              <option value="all">All Status</option>
              {activeTab === "questions" ? (
                <>
                  <option value="new">New</option>
                  <option value="drafting">Drafting</option>
                  <option value="answered">Answered</option>
                  <option value="skipped">Skipped</option>
                </>
              ) : (
                <>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </>
              )}
            </select>
          </div>
          {activeTab === "questions" && (
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm"
            >
              <option value="all">All Platforms</option>
              <option value="zhihu">Zhihu</option>
              <option value="quora">Quora</option>
              <option value="reddit">Reddit</option>
            </select>
          )}
        </div>

        {/* Questions List */}
        {activeTab === "questions" && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No questions collected yet. Click "Collect" to start.</p>
              </div>
            ) : (
              questions.map((q) => (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{platformIcons[q.platform] || "🌐"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status] || "bg-zinc-100 text-zinc-600"}`}>
                          {q.status}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                          ID: {q.id}
                        </span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          Score: {(q.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <h3 className="font-semibold text-zinc-900 mb-1 leading-tight">{q.title}</h3>
                      {q.description && (
                        <p className="text-sm text-zinc-500 line-clamp-2">{q.description}</p>
                      )}
                      {q.matched_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.matched_tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {q.url && (
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="Open original"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleGenerate(q.id)}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                        title="Generate answer"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSkipQuestion(q.id)}
                        className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Skip"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Answers List */}
        {activeTab === "answers" && (
          <div className="space-y-4">
            {answers.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No answers generated yet. Select a question and click Generate.</p>
              </div>
            ) : (
              answers.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100"
                >
                  {/* Answer Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{platformIcons[a.platform] || "🌐"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || "bg-zinc-100 text-zinc-600"}`}>
                          {a.status}
                        </span>
                        <span className="text-xs text-zinc-400">{a.language === "zh" ? "Chinese" : "English"}</span>
                      </div>
                      <h3 className="font-semibold text-zinc-900 text-sm">{a.question_title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.question_url && (
                        <a
                          href={a.question_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="Open question"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleCopy(a.content, a.id)}
                        className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === a.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Answer Content */}
                  {editingAnswer?.id === a.id ? (
                    <div className="mb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-4 border border-zinc-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            handleUpdateAnswer(a.id, editContent);
                            setEditingAnswer(null);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingAnswer(null)}
                          className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm prose-zinc max-w-none mb-4 cursor-pointer hover:bg-zinc-50 rounded-xl p-3 -mx-3 transition-colors"
                      onClick={() => { setEditingAnswer(a); setEditContent(a.content); }}
                      title="Click to edit"
                    >
                      <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 leading-relaxed">
                        {a.content}
                      </pre>
                    </div>
                  )}

                  {/* Answer Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                    {a.status === "draft" && (
                      <button
                        onClick={() => handleUpdateAnswer(a.id, undefined, "approved")}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(a.content, a.id)}
                      className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === a.id ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy Answer</>
                      )}
                    </button>
                    {a.sources.length > 0 && (
                      <span className="text-xs text-zinc-400 ml-auto">
                        Sources: {a.sources.join(", ")}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
