import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Box,
  Check,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Code2,
  Command,
  Database,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Github,
  GitBranch,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Terminal,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import type {
  ChatResponse,
  ChatTurn,
  FileTreeResponse,
  GithubConnection,
  HealthResponse,
  IndexStatus,
  PipelineDetail,
  PipelineList,
  PipelineRun,
  Repository,
  RepositoryList,
  Workflow as WorkflowType,
  WorkflowDispatchResponse,
  WorkflowList,
} from "@/lib/types";

const SESSION_ID = crypto.randomUUID();

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { detail?: string } | null;
    return body?.detail ?? `Request failed (${error.status})`;
  }
  return error instanceof Error ? error.message : "Request failed";
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(status: string | null, conclusion: string | null): string {
  if (conclusion === "success") return "text-[#3FB950]";
  if (conclusion === "failure" || conclusion === "cancelled") return "text-[#F85149]";
  if (status === "in_progress") return "text-[#D29922]";
  return "text-[#8B949E]";
}

function StatusDot({ status, conclusion }: { status: string | null; conclusion: string | null }) {
  const tone = statusTone(status, conclusion);
  return <span aria-hidden="true" className={`inline-block size-2 rounded-full bg-current ${tone} ${status === "in_progress" ? "signal-pulse" : ""}`} />;
}
import type { LucideIcon } from "lucide-react";

function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-[#21262D] text-[#8B949E]">
        <Icon className="size-4" />
      </div>
      <p className="text-xs font-semibold text-[#C9D1D9]">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-[#6E7681]">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#21262D] text-[#8B949E]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6E7681]">
            {eyebrow}
          </p>
          <h2 className="truncate text-sm font-semibold text-[#F0F6FC]">
            {title}
          </h2>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Sidebar({ activeNav, onNav, connected, onSettings }: { activeNav: string; onNav: (id: string) => void; connected: boolean; onSettings: () => void }) {
  const navItems = [
    { id: "chat", label: "Chat workspace", icon: Bot },
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "pipelines", label: "Pipelines", icon: Activity },
    { id: "indexing", label: "Indexing status", icon: Database },
  ];
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#30363D] bg-[#0D1117] lg:flex" data-testid="sidebar-panel">
      <div className="flex h-14 items-center gap-3 border-b border-[#21262D] px-5" data-testid="brand-header">
        <div className="flex size-7 items-center justify-center rounded-md bg-[#2F81F7] text-[#F0F6FC] shadow-[0_0_18px_rgba(47,129,247,0.35)]"><Terminal className="size-4" /></div>
        <div>
          <p className="text-sm font-bold tracking-tight text-[#F0F6FC]" data-testid="brand-name">DevOps Pipeline</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6E7681]" data-testid="brand-subtitle">Hindsight agent</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6E7681]" data-testid="navigation-label">Navigation</p>
        <nav className="space-y-1" data-testid="sidebar-navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              data-testid={`sidebar-${id}-button`}
              onClick={() => onNav(id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#58A6FF] ${activeNav === id ? "bg-[#21262D] text-[#F0F6FC]" : "text-[#8B949E] hover:bg-[#161B22] hover:text-[#C9D1D9]"}`}
            >
              <Icon className={`size-4 ${activeNav === id ? "text-[#58A6FF]" : "text-[#6E7681]"}`} />
              <span data-testid={`sidebar-${id}-label`}>{label}</span>
              {id === "chat" && <span className="ml-auto size-1.5 rounded-full bg-[#3FB950]" />}
            </button>
          ))}
        </nav>

        <p className="mb-2 mt-8 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6E7681]" data-testid="context-label">Context</p>
        <div className="space-y-1">
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-[#8B949E]" data-testid="context-repository-item"><FolderGit2 className="size-4 text-[#6E7681]" /><span data-testid="context-repository-label">Repository context</span></div>
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-[#8B949E]" data-testid="context-hindsight-item"><History className="size-4 text-[#6E7681]" /><span data-testid="context-hindsight-label">Hindsight memory</span><span className="ml-auto font-mono text-[9px] text-[#6E7681]" data-testid="context-hindsight-status">MVP</span></div>
        </div>
      </div>

      <div className="border-t border-[#21262D] p-3">
        <button type="button" data-testid="github-connection-status-button" onClick={onSettings} className="mb-2 flex w-full items-center gap-3 rounded-lg border border-[#30363D] bg-[#161B22] p-3 text-left outline-none transition-colors hover:border-[#58A6FF]/60 focus-visible:ring-2 focus-visible:ring-[#58A6FF]">
          <div className={`flex size-8 items-center justify-center rounded-md ${connected ? "bg-[#238636]/15 text-[#3FB950]" : "bg-[#F85149]/10 text-[#F85149]"}`}><Github className="size-4" /></div>
          <div className="min-w-0 flex-1"><p className="text-xs font-medium text-[#C9D1D9]" data-testid="github-connection-label">GitHub connection</p><p className="mt-0.5 truncate font-mono text-[10px] text-[#8B949E]" data-testid="github-connection-state">{connected ? "Connected" : "Setup required"}</p></div>
          <Settings2 className="size-3.5 text-[#6E7681]" />
        </button>
        <div className="flex items-center justify-between px-2 py-1.5 text-[10px] text-[#6E7681]" data-testid="ollama-model-status"><span className="flex items-center gap-1.5"><Zap className="size-3 text-[#A371F7]" /> Ollama local</span><span className="font-mono" data-testid="ollama-model-status-value">Optional</span></div>
      </div>
    </aside>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [activeNav, setActiveNav] = useState("chat");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [token, setToken] = useState("");
  const [branch, setBranch] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: () => apiGet<HealthResponse>("/health"), retry: false, refetchInterval: 30000 });
  const repositoriesQuery = useQuery({ queryKey: ["repositories"], queryFn: () => apiGet<RepositoryList>("/repositories"), retry: false, refetchInterval: 60000 });
  const repositories = repositoriesQuery.data?.repositories ?? [];
  const activeRepository = useMemo<Repository | null>(() => repositories.find((repository) => repository.id === selectedRepoId) ?? null, [repositories, selectedRepoId]);

  useEffect(() => {
    if (!selectedRepoId && repositories.length > 0) setSelectedRepoId(repositories[0].id);
    if (selectedRepoId && repositories.length > 0 && !repositories.some((repository) => repository.id === selectedRepoId)) setSelectedRepoId(null);
  }, [repositories, selectedRepoId]);

  useEffect(() => {
    if (activeRepository) setBranch(activeRepository.default_branch);
  }, [activeRepository]);

  const indexQuery = useQuery({ queryKey: ["index-status", selectedRepoId], queryFn: () => apiGet<IndexStatus>(`/repositories/${selectedRepoId}/index-status`), enabled: Boolean(selectedRepoId), retry: false });
  const filesQuery = useQuery({ queryKey: ["files", selectedRepoId], queryFn: () => apiGet<FileTreeResponse>(`/repositories/${selectedRepoId}/files`), enabled: Boolean(selectedRepoId), retry: false });
  const workflowsQuery = useQuery({ queryKey: ["workflows", selectedRepoId], queryFn: () => apiGet<WorkflowList>(`/repositories/${selectedRepoId}/workflows`), enabled: Boolean(selectedRepoId), retry: false });
  const pipelinesQuery = useQuery({ queryKey: ["pipelines", selectedRepoId], queryFn: () => apiGet<PipelineList>(`/pipelines?repository_id=${selectedRepoId}`), enabled: Boolean(selectedRepoId), retry: false, refetchInterval: 30000 });
  const runDetailQuery = useQuery({ queryKey: ["pipeline", selectedRepoId, selectedRunId], queryFn: () => apiGet<PipelineDetail>(`/pipelines/${selectedRunId}?repository_id=${selectedRepoId}`), enabled: Boolean(selectedRepoId && selectedRunId), retry: false });

  const connectMutation = useMutation({
    mutationFn: (value: string) => apiPost<GithubConnection>("/github/connect", { token: value }),
    onSuccess: () => {
      setToken("");
      setSettingsOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      void queryClient.invalidateQueries({ queryKey: ["health"] });
      toast.success("GitHub connected", { description: "Repositories are loading from your account." });
    },
    onError: (error) => toast.error("GitHub connection failed", { description: getErrorMessage(error) }),
  });
  const disconnectMutation = useMutation({
    mutationFn: () => apiDelete<GithubConnection>("/github/connect"),
    onSuccess: () => {
      setSelectedRepoId(null);
      setTurns([]);
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      void queryClient.invalidateQueries({ queryKey: ["health"] });
      toast.success("GitHub disconnected");
    },
    onError: (error) => toast.error("Could not clear GitHub token", { description: getErrorMessage(error) }),
  });
  const indexMutation = useMutation({
    mutationFn: (repositoryId: number) => apiPost<IndexStatus>(`/repositories/${repositoryId}/index`),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["index-status", selectedRepoId] });
      void queryClient.invalidateQueries({ queryKey: ["files", selectedRepoId] });
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast.success(result.status === "Indexed" ? "Repository indexed" : "Indexing finished", { description: result.message ?? undefined });
    },
    onError: (error) => toast.error("Repository indexing failed", { description: getErrorMessage(error) }),
  });
  const dispatchMutation = useMutation({
    mutationFn: (payload: { workflowId: number; repositoryId: number; ref: string }) => apiPost<WorkflowDispatchResponse>(`/workflows/${payload.workflowId}/run`, { repository_id: payload.repositoryId, ref: payload.ref, inputs: {} }),
    onSuccess: (result) => {
      setDeployOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["pipelines", selectedRepoId] });
      toast.success("Workflow dispatched", { description: result.message });
    },
    onError: (error) => toast.error("Workflow dispatch failed", { description: getErrorMessage(error) }),
  });
  const chatMutation = useMutation({
    mutationFn: (value: string) => apiPost<ChatResponse>("/chat", { repository_id: selectedRepoId, question: value, session_id: SESSION_ID }),
    onSuccess: (result, value) => {
      setTurns((current) => [...current, { id: `${Date.now()}-assistant`, role: "assistant", content: result.answer ?? result.message ?? "No response was generated.", sources: result.sources, aiAvailable: result.ai_available, message: result.message ?? undefined }]);
      setQuestion("");
      if (!result.ai_available) toast.info("AI response unavailable", { description: result.message ?? "No response was generated." });
      void value;
    },
    onError: (error, value) => {
      setTurns((current) => [...current, { id: `${Date.now()}-error`, role: "assistant", content: getErrorMessage(error), aiAvailable: false, message: "Request error" }]);
      setQuestion(value);
    },
  });

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!activeRepository || !trimmed || chatMutation.isPending) return;
    setTurns((current) => [...current, { id: `${Date.now()}-user`, role: "user", content: trimmed }]);
    chatMutation.mutate(trimmed);
  };

  const selectRepository = (repository: Repository) => {
    setSelectedRepoId(repository.id);
    setRepoMenuOpen(false);
    setSelectedRunId(null);
    setTurns([]);
  };

  const openDeploy = (workflow?: WorkflowType) => {
    if (!activeRepository) {
      toast.info("Select a repository first");
      return;
    }
    setSelectedWorkflowId(workflow?.id ?? workflowsQuery.data?.workflows.find((item) => item.can_dispatch)?.id ?? null);
    setBranch(activeRepository.default_branch);
    setDeployOpen(true);
  };

  return (
    <div className="flex min-h-svh bg-[#080C14] text-[#F0F6FC]" data-testid="devops-agent-app">
      <Sidebar activeNav={activeNav} onNav={setActiveNav} connected={Boolean(healthQuery.data?.github_connected || repositoriesQuery.data?.connected)} onSettings={() => setSettingsOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex min-h-14 items-center justify-between gap-3 border-b border-[#30363D] bg-[#0D1117]/90 px-4 backdrop-blur-md sm:px-6" data-testid="top-header">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" data-testid="mobile-menu-button" className="rounded-md p-1.5 text-[#8B949E] hover:bg-[#21262D] lg:hidden"><Menu className="size-4" /></button>
            <div className="relative">
              <button type="button" data-testid="repository-selector-button" onClick={() => setRepoMenuOpen((open) => !open)} className="flex max-w-[245px] items-center gap-2 rounded-md border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-left outline-none transition-colors hover:border-[#58A6FF]/60 focus-visible:ring-2 focus-visible:ring-[#58A6FF]">
                <FolderGit2 className="size-3.5 shrink-0 text-[#58A6FF]" />
                <span className="truncate text-xs font-semibold text-[#C9D1D9]" data-testid="repository-selector-value">{activeRepository?.full_name ?? "Select repository"}</span>
                <ChevronDown className="size-3.5 shrink-0 text-[#6E7681]" />
              </button>
              {repoMenuOpen && (
                <div className="absolute left-0 top-10 z-30 w-80 overflow-hidden rounded-lg border border-[#30363D] bg-[#161B22] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]" data-testid="repository-selector-menu">
                  <div className="flex items-center justify-between border-b border-[#30363D] px-2 pb-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B949E]" data-testid="repository-menu-label">Available repositories</p><Github className="size-3.5 text-[#6E7681]" /></div>
                  {repositoriesQuery.isLoading && <p className="px-2 py-5 text-xs text-[#8B949E]" data-testid="repository-menu-loading">Loading from GitHub…</p>}
                  {repositoriesQuery.isError && <div className="px-2 py-5"><p className="text-xs text-[#F85149]" data-testid="repository-menu-error">{getErrorMessage(repositoriesQuery.error)}</p><Button type="button" size="sm" variant="outline" className="mt-3" data-testid="repository-menu-retry-button" onClick={() => void repositoriesQuery.refetch()}>Retry</Button></div>}
                  {!repositoriesQuery.isLoading && !repositoriesQuery.isError && repositories.length === 0 && <div className="px-2 py-5"><p className="text-xs text-[#8B949E]" data-testid="repository-menu-empty">{repositoriesQuery.data?.message ?? "No repositories available."}</p><Button type="button" size="sm" className="mt-3" data-testid="repository-menu-settings-button" onClick={() => setSettingsOpen(true)}>Connect GitHub</Button></div>}
                  <div className="max-h-72 overflow-y-auto pt-1">
                    {repositories.map((repository) => <button type="button" key={repository.id} data-testid={`repository-option-${repository.id}`} onClick={() => selectRepository(repository)} className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-[#21262D] focus-visible:ring-2 focus-visible:ring-[#58A6FF] ${repository.id === selectedRepoId ? "bg-[#21262D]" : ""}`}><div className="flex size-7 items-center justify-center rounded-md border border-[#30363D] bg-[#0D1117] text-[#8B949E]"><FolderGit2 className="size-3.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-[#C9D1D9]" data-testid={`repository-option-name-${repository.id}`}>{repository.full_name}</p><p className="font-mono text-[10px] text-[#6E7681]" data-testid={`repository-option-branch-${repository.id}`}>{repository.private ? "Private" : "Public"} · {repository.default_branch}</p></div>{repository.id === selectedRepoId && <Check className="size-3.5 text-[#3FB950]" />}</button>)}
                  </div>
                </div>
              )}
            </div>
            <span className="hidden items-center gap-1.5 font-mono text-[10px] text-[#6E7681] sm:flex" data-testid="header-context-label"><span className="size-1.5 rounded-full bg-[#3FB950]" /> Live GitHub context</span>
          </div>
          <div className="flex items-center gap-2">
            {activeRepository && <Badge variant="outline" className="hidden border-[#30363D] bg-[#0D1117] text-[10px] text-[#8B949E] sm:inline-flex" data-testid="header-index-status-badge"><span className={`mr-1.5 size-1.5 rounded-full ${indexQuery.data?.status === "Indexed" ? "bg-[#3FB950]" : indexQuery.data?.status === "Indexing" ? "bg-[#D29922] signal-pulse" : "bg-[#6E7681]"}`} />{indexQuery.data?.status ?? "Checking index"}</Badge>}
            <Button type="button" size="sm" data-testid="deploy-button" onClick={() => openDeploy()} className="gap-1.5 bg-[#238636] text-white hover:bg-[#2EA043]"><Plus className="size-3.5" /> Deploy</Button>
            <Button type="button" size="icon-sm" variant="ghost" data-testid="header-settings-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings2 className="size-4 text-[#8B949E]" /></Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" data-testid="main-workspace">
          <div className="mx-auto max-w-[1540px] p-4 sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end" data-testid="workspace-intro">
              <div><p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#58A6FF]" data-testid="workspace-eyebrow"><Command className="size-3" /> Operator console</p><h1 className="text-2xl font-bold tracking-tight text-[#F0F6FC] sm:text-3xl" data-testid="workspace-title">Repository-aware DevOps assistant</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8B949E]" data-testid="workspace-description">Ask questions against indexed code, inspect real GitHub Actions, and dispatch workflows without leaving the control plane.</p></div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#6E7681]" data-testid="workspace-live-status"><span className="signal-pulse size-2 rounded-full bg-[#3FB950]" /> LIVE DATA ONLY</div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <section className="flex min-h-[660px] flex-col overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] shadow-[0_4px_20px_rgba(0,0,0,0.28)] lg:col-span-7" data-testid="chat-workspace-panel">
                <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3 sm:px-5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg border border-[#A371F7]/30 bg-[#A371F7]/10 text-[#A371F7]"><Bot className="size-4" /></div><div><p className="text-sm font-semibold text-[#F0F6FC]" data-testid="chat-panel-title">AI Agent</p><p className="font-mono text-[10px] text-[#6E7681]" data-testid="chat-panel-context">{activeRepository ? activeRepository.full_name : "No repository selected"}</p></div></div><Badge variant="outline" className="border-[#30363D] bg-[#0D1117] text-[10px] text-[#8B949E]" data-testid="chat-model-badge"><Zap className="mr-1 size-3 text-[#A371F7]" /> Ollama</Badge></div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5" data-testid="chat-message-list">
                  {turns.length === 0 && <div className="flex min-h-[410px] flex-col items-center justify-center text-center" data-testid="chat-empty-state"><div className="relative mb-5"><div className="absolute inset-0 rounded-2xl bg-[#2F81F7]/10 blur-xl" /><div className="relative flex size-14 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] text-[#58A6FF]"><Code2 className="size-6" /></div></div><h2 className="text-lg font-semibold text-[#F0F6FC]" data-testid="chat-empty-title">Your repository, in context</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-[#8B949E]" data-testid="chat-empty-description">Select a repository and index it to ground the agent in real files. Ollama must be reachable for an AI answer.</p><div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2"><button type="button" data-testid="quick-prompt-architecture-button" onClick={() => setQuestion("Explain the repository architecture.")} className="rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-left text-xs text-[#C9D1D9] outline-none transition-colors hover:border-[#58A6FF]/60 hover:bg-[#21262D] focus-visible:ring-2 focus-visible:ring-[#58A6FF]">Explain the repository architecture <span className="mt-1 block font-mono text-[10px] text-[#6E7681]">structure · services · flow</span></button><button type="button" data-testid="quick-prompt-auth-button" onClick={() => setQuestion("Where is authentication implemented?")} className="rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-left text-xs text-[#C9D1D9] outline-none transition-colors hover:border-[#58A6FF]/60 hover:bg-[#21262D] focus-visible:ring-2 focus-visible:ring-[#58A6FF]">Locate authentication <span className="mt-1 block font-mono text-[10px] text-[#6E7681]">files · entry points · risks</span></button></div></div>}
                  <div className="space-y-4">
                    {turns.map((turn) => <div key={turn.id} className={`flex gap-3 ${turn.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-message-${turn.id}`}><div className={`max-w-[92%] rounded-lg border px-4 py-3 ${turn.role === "user" ? "border-[#2F81F7]/40 bg-[#2F81F7]/10" : "border-[#30363D] bg-[#0D1117]"}`}><div className="mb-2 flex items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E7681]" data-testid={`chat-message-role-${turn.id}`}>{turn.role === "user" ? "You" : "Agent"}</span>{turn.role === "assistant" && !turn.aiAvailable && <Badge variant="outline" className="h-4 border-[#D29922]/40 px-1.5 text-[9px] text-[#D29922]" data-testid={`chat-message-unavailable-${turn.id}`}>AI unavailable</Badge>}</div><p className="whitespace-pre-wrap text-sm leading-6 text-[#C9D1D9]" data-testid={`chat-message-content-${turn.id}`}>{turn.content}</p>{turn.sources && turn.sources.length > 0 && <div className="mt-4 border-t border-[#30363D] pt-3"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E7681]" data-testid={`chat-sources-label-${turn.id}`}>Sources inspected</p><div className="space-y-1.5">{turn.sources.map((source, index) => <div key={`${source.path}-${index}`} className="flex items-start gap-2 rounded-md bg-[#161B22] px-2.5 py-2" data-testid={`chat-source-${turn.id}-${index}`}><FileCode2 className="mt-0.5 size-3.5 shrink-0 text-[#58A6FF]" /><div className="min-w-0"><p className="truncate font-mono text-[10px] text-[#58A6FF]" data-testid={`chat-source-path-${turn.id}-${index}`}>{source.path}</p><p className="mt-1 line-clamp-2 font-mono text-[10px] leading-4 text-[#6E7681]" data-testid={`chat-source-snippet-${turn.id}-${index}`}>{source.snippet}</p></div></div>)}</div></div>}</div></div>)}
                    {chatMutation.isPending && <div className="flex items-center gap-3 text-xs text-[#8B949E]" data-testid="chat-loading-state"><LoaderCircle className="size-4 animate-spin text-[#58A6FF]" /> Retrieving repository context and asking Ollama…</div>}
                  </div>
                </div>
                <div className="border-t border-[#30363D] bg-[#0D1117]/70 p-3 sm:p-4"><form onSubmit={submitQuestion} className="relative" data-testid="chat-composer-form"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!activeRepository || chatMutation.isPending} data-testid="chat-question-input" placeholder={activeRepository ? "Ask about the indexed repository…" : "Select a repository to start…"} className="min-h-[74px] resize-none border-[#30363D] bg-[#161B22] pr-12 text-sm text-[#F0F6FC] placeholder:text-[#6E7681] focus-visible:border-[#58A6FF] focus-visible:ring-[#58A6FF]/30" /><Button type="submit" size="icon" disabled={!activeRepository || !question.trim() || chatMutation.isPending} data-testid="chat-send-button" className="absolute bottom-2.5 right-2.5 bg-[#2F81F7] text-white hover:bg-[#388BFD]" aria-label="Send question"><Send className="size-4" /></Button></form><div className="mt-2 flex items-center justify-between px-1"><p className="font-mono text-[10px] text-[#6E7681]" data-testid="chat-security-note"><LockKeyhole className="mr-1 inline size-3" /> Context is limited to indexed files</p><p className="font-mono text-[10px] text-[#6E7681]" data-testid="chat-shortcut-note">⌘ ↵ to send</p></div></div>
              </section>

              <div className="space-y-4 lg:col-span-5">
                <Card className="border-[#30363D] bg-[#161B22] shadow-none" data-testid="workflows-panel"><CardHeader className="border-b border-[#30363D] px-4 py-3"><SectionHeading icon={Workflow} eyebrow="GitHub Actions" title="Workflows" action={<Button type="button" size="icon-xs" variant="ghost" data-testid="workflows-refresh-button" onClick={() => void workflowsQuery.refetch()}><RefreshCw className={`size-3.5 ${workflowsQuery.isFetching ? "animate-spin" : ""}`} /></Button>} /></CardHeader><CardContent className="p-4">{!activeRepository ? <EmptyPanel icon={FolderGit2} title="Select a repository" description="Workflows appear here after you select a live GitHub repository." /> : workflowsQuery.isLoading ? <div className="flex items-center gap-2 py-6 text-xs text-[#8B949E]" data-testid="workflows-loading"><LoaderCircle className="size-4 animate-spin" /> Loading workflows from GitHub…</div> : workflowsQuery.isError ? <div className="rounded-lg border border-[#F85149]/30 bg-[#F85149]/5 p-3 text-xs text-[#F85149]" data-testid="workflows-error">{getErrorMessage(workflowsQuery.error)}</div> : workflowsQuery.data?.workflows.length === 0 ? <EmptyPanel icon={Workflow} title="No workflows found" description={workflowsQuery.data.message ?? "This repository has no available GitHub Actions workflows."} /> : <div className="space-y-2" data-testid="workflow-list">{workflowsQuery.data?.workflows.map((workflow) => <div key={workflow.id} className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3" data-testid={`workflow-card-${workflow.id}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#C9D1D9]" data-testid={`workflow-name-${workflow.id}`}>{workflow.name}</p><p className="mt-1 truncate font-mono text-[10px] text-[#6E7681]" data-testid={`workflow-path-${workflow.id}`}>{workflow.path}</p></div><Badge variant="outline" className={`border-[#30363D] text-[9px] ${workflow.state === "active" ? "text-[#3FB950]" : "text-[#8B949E]"}`} data-testid={`workflow-state-${workflow.id}`}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{workflow.state}</Badge></div><div className="mt-3 flex items-center justify-between"><span className="font-mono text-[10px] text-[#6E7681]" data-testid={`workflow-dispatch-state-${workflow.id}`}>{workflow.can_dispatch ? "Dispatch available" : "Dispatch unavailable"}</span>{workflow.can_dispatch && <Button type="button" size="xs" variant="outline" data-testid={`workflow-run-${workflow.id}-button`} onClick={() => openDeploy(workflow)}><Play className="size-3" /> Run</Button>}</div></div>)}</div>}</CardContent></Card>

                <Card className="border-[#30363D] bg-[#161B22] shadow-none" data-testid="pipelines-panel"><CardHeader className="border-b border-[#30363D] px-4 py-3"><SectionHeading icon={Activity} eyebrow="Live runs" title="Pipeline monitor" action={<Button type="button" size="icon-xs" variant="ghost" data-testid="pipelines-refresh-button" onClick={() => void pipelinesQuery.refetch()}><RefreshCw className={`size-3.5 ${pipelinesQuery.isFetching ? "animate-spin" : ""}`} /></Button>} /></CardHeader><CardContent className="p-4">{!activeRepository ? <EmptyPanel icon={Activity} title="No active pipeline" description="Select a repository to read real workflow runs." /> : pipelinesQuery.isLoading ? <div className="flex items-center gap-2 py-6 text-xs text-[#8B949E]" data-testid="pipelines-loading"><LoaderCircle className="size-4 animate-spin" /> Reading Actions runs…</div> : pipelinesQuery.isError ? <div className="rounded-lg border border-[#F85149]/30 bg-[#F85149]/5 p-3 text-xs text-[#F85149]" data-testid="pipelines-error">{getErrorMessage(pipelinesQuery.error)}</div> : pipelinesQuery.data?.runs.length === 0 ? <EmptyPanel icon={Activity} title="No pipeline runs" description={pipelinesQuery.data.message ?? "No GitHub Actions runs have been returned for this repository."} /> : <div className="space-y-1.5" data-testid="pipeline-run-list">{pipelinesQuery.data?.runs.slice(0, 6).map((run) => <button type="button" key={run.id} data-testid={`pipeline-run-${run.id}-button`} onClick={() => setSelectedRunId(run.id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left outline-none transition-colors hover:bg-[#21262D] focus-visible:ring-2 focus-visible:ring-[#58A6FF] ${selectedRunId === run.id ? "border-[#58A6FF]/50 bg-[#2F81F7]/5" : "border-transparent bg-[#0D1117]"}`}><StatusDot status={run.status} conclusion={run.conclusion} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-[#C9D1D9]" data-testid={`pipeline-run-name-${run.id}`}>{run.name}</p><p className="mt-1 truncate font-mono text-[10px] text-[#6E7681]" data-testid={`pipeline-run-meta-${run.id}`}>#{run.run_number ?? run.id} · {run.branch ?? "unknown branch"} · {run.conclusion ?? run.status ?? "unknown"}</p></div><ChevronDown className="size-3.5 -rotate-90 text-[#6E7681]" /></button>)}</div>}</CardContent></Card>

                {selectedRunId && <Card className="border-[#30363D] bg-[#161B22] shadow-none" data-testid="pipeline-detail-panel"><CardHeader className="border-b border-[#30363D] px-4 py-3"><SectionHeading icon={Terminal} eyebrow="Run detail" title="Jobs & steps" action={<Button type="button" size="icon-xs" variant="ghost" data-testid="pipeline-detail-close-button" onClick={() => setSelectedRunId(null)}><X className="size-3.5" /></Button>} /></CardHeader><CardContent className="p-4">{runDetailQuery.isLoading ? <div className="flex items-center gap-2 py-4 text-xs text-[#8B949E]" data-testid="pipeline-detail-loading"><LoaderCircle className="size-4 animate-spin" /> Loading jobs…</div> : runDetailQuery.isError ? <p className="text-xs text-[#F85149]" data-testid="pipeline-detail-error">{getErrorMessage(runDetailQuery.error)}</p> : <div className="space-y-2" data-testid="pipeline-job-list">{runDetailQuery.data?.jobs.length ? runDetailQuery.data.jobs.map((job) => <div key={job.id} className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3" data-testid={`pipeline-job-${job.id}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-[#C9D1D9]" data-testid={`pipeline-job-name-${job.id}`}>{job.name}</p><span className={`font-mono text-[10px] ${statusTone(job.status, job.conclusion)}`} data-testid={`pipeline-job-status-${job.id}`}>{job.conclusion ?? job.status ?? "unknown"}</span></div>{job.steps.length > 0 && <div className="mt-2 space-y-1 border-l border-[#30363D] pl-3">{job.steps.map((step) => <div key={`${job.id}-${step.number}-${step.name}`} className="flex items-center gap-2 text-[10px] text-[#8B949E]" data-testid={`pipeline-step-${job.id}-${step.number ?? step.name}`}><StatusDot status={step.status} conclusion={step.conclusion} /><span className="truncate" data-testid={`pipeline-step-name-${job.id}-${step.number ?? step.name}`}>{step.name}</span><span className="ml-auto font-mono text-[#6E7681]">{step.conclusion ?? step.status ?? "—"}</span></div>)}</div>}</div>) : <p className="text-xs text-[#8B949E]" data-testid="pipeline-no-jobs">GitHub returned no jobs for this run yet.</p>}</div>}</CardContent></Card>}

                <Card className="border-[#30363D] bg-[#161B22] shadow-none" data-testid="indexing-panel"><CardHeader className="border-b border-[#30363D] px-4 py-3"><SectionHeading icon={Database} eyebrow="Repository knowledge" title="Indexing status" action={<Button type="button" size="icon-xs" variant="ghost" data-testid="index-refresh-button" onClick={() => { void indexQuery.refetch(); void filesQuery.refetch(); }}><RefreshCw className={`size-3.5 ${indexQuery.isFetching || filesQuery.isFetching ? "animate-spin" : ""}`} /></Button>} /></CardHeader><CardContent className="p-4">{!activeRepository ? <EmptyPanel icon={Database} title="Repository not indexed" description="Select a repository to inspect its real file tree." /> : <div data-testid="indexing-content"><div className="flex items-center justify-between rounded-lg border border-[#30363D] bg-[#0D1117] p-3"><div className="flex items-center gap-3"><div className={`flex size-8 items-center justify-center rounded-md ${indexQuery.data?.status === "Indexed" ? "bg-[#238636]/15 text-[#3FB950]" : "bg-[#D29922]/10 text-[#D29922]"}`}><Database className="size-4" /></div><div><p className="text-xs font-semibold text-[#C9D1D9]" data-testid="index-status-value">{indexQuery.data?.status ?? "Checking status"}</p><p className="mt-1 font-mono text-[10px] text-[#6E7681]" data-testid="index-status-message">{indexQuery.data?.message ?? "GitHub tree status is loading."}</p></div></div><Button type="button" size="xs" variant="outline" disabled={indexMutation.isPending} data-testid="index-repository-button" onClick={() => indexMutation.mutate(activeRepository.id)}>{indexMutation.isPending ? <LoaderCircle className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}{indexQuery.data?.status === "Indexed" ? "Re-index" : "Index"}</Button></div>{indexQuery.data?.status === "Indexed" && <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-md border border-[#30363D] bg-[#0D1117] p-2.5"><p className="font-mono text-[10px] text-[#6E7681]" data-testid="index-files-label">Files</p><p className="mt-1 text-sm font-semibold text-[#F0F6FC]" data-testid="index-files-count">{indexQuery.data.files_count}</p></div><div className="rounded-md border border-[#30363D] bg-[#0D1117] p-2.5"><p className="font-mono text-[10px] text-[#6E7681]" data-testid="index-chunks-label">Chunks</p><p className="mt-1 text-sm font-semibold text-[#F0F6FC]" data-testid="index-chunks-count">{indexQuery.data.chunks_count}</p></div><div className="rounded-md border border-[#30363D] bg-[#0D1117] p-2.5"><p className="font-mono text-[10px] text-[#6E7681]" data-testid="index-commit-label">Commit</p><p className="mt-1 truncate font-mono text-xs text-[#58A6FF]" title={indexQuery.data.commit_sha ?? ""} data-testid="index-commit-value">{indexQuery.data.commit_sha?.slice(0, 8) ?? "—"}</p></div></div>}{filesQuery.isError ? <p className="mt-3 text-xs text-[#F85149]" data-testid="files-tree-error">{getErrorMessage(filesQuery.error)}</p> : filesQuery.data && <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E7681]" data-testid="files-tree-label">Readable files on GitHub</p><span className="font-mono text-[10px] text-[#6E7681]" data-testid="files-tree-count">{filesQuery.data.files_count} returned</span></div><div className="max-h-40 space-y-1 overflow-y-auto">{filesQuery.data.files.slice(0, 12).map((file) => <div key={file.path} className="flex items-center gap-2 rounded px-2 py-1.5 text-[10px] text-[#8B949E] hover:bg-[#0D1117]" data-testid={`repository-file-${file.path.replaceAll("/", "-")}`}><FileCode2 className="size-3 shrink-0 text-[#6E7681]" /><span className="truncate font-mono" data-testid={`repository-file-path-${file.path.replaceAll("/", "-")}`}>{file.path}</span></div>)}{filesQuery.data.truncated && <p className="px-2 py-2 font-mono text-[10px] text-[#D29922]" data-testid="files-tree-truncated">GitHub reported a truncated tree response.</p>}</div></div>}</div>}</CardContent></Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080C14]/80 p-4 backdrop-blur-sm" data-testid="settings-dialog-overlay"><div className="w-full max-w-md rounded-xl border border-[#30363D] bg-[#161B22] shadow-[0_12px_50px_rgba(0,0,0,0.6)]" role="dialog" aria-modal="true" data-testid="settings-dialog"><div className="flex items-start justify-between border-b border-[#30363D] px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#58A6FF]" data-testid="settings-eyebrow">Secure configuration</p><h2 className="mt-1 text-base font-semibold text-[#F0F6FC]" data-testid="settings-title">Connection settings</h2></div><Button type="button" size="icon-sm" variant="ghost" data-testid="settings-close-button" onClick={() => setSettingsOpen(false)}><X className="size-4" /></Button></div><div className="space-y-5 p-5"><div className="rounded-lg border border-[#238636]/30 bg-[#238636]/5 p-3"><div className="flex gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3FB950]" /><p className="text-xs leading-relaxed text-[#8B949E]" data-testid="settings-security-note">Your PAT is validated server-side, kept in backend memory for this session, and never returned to the browser or sent to Ollama.</p></div></div><div><label htmlFor="github-pat" className="mb-2 flex items-center gap-2 text-xs font-medium text-[#C9D1D9]" data-testid="github-pat-label"><KeyRound className="size-3.5 text-[#58A6FF]" /> GitHub Personal Access Token</label><Input id="github-pat" type="password" value={token} onChange={(event) => setToken(event.target.value)} data-testid="github-pat-input" placeholder="github_pat_…" autoComplete="off" className="border-[#30363D] bg-[#0D1117] text-[#F0F6FC] placeholder:text-[#6E7681]" /><p className="mt-2 text-[10px] leading-relaxed text-[#6E7681]" data-testid="github-pat-help">Fine-grained token permissions: Metadata read, Contents read, Actions read. Add Actions write to dispatch workflows.</p></div><div className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#C9D1D9]" data-testid="ollama-settings-label">Ollama model</p><p className="mt-1 font-mono text-[10px] text-[#6E7681]" data-testid="ollama-settings-value">{healthQuery.data?.ollama_model ?? "Configured on backend"}</p></div><span className="rounded-full bg-[#A371F7]/10 px-2 py-1 font-mono text-[9px] text-[#A371F7]" data-testid="ollama-settings-state">Optional</span></div></div><div className="flex items-center justify-between gap-3 pt-1"><Button type="button" variant="ghost" data-testid="github-disconnect-button" disabled={!healthQuery.data?.github_connected || disconnectMutation.isPending} onClick={() => disconnectMutation.mutate()} className="text-[#F85149] hover:bg-[#F85149]/10 hover:text-[#F85149]">Disconnect</Button><Button type="button" data-testid="github-connect-button" disabled={token.trim().length < 10 || connectMutation.isPending} onClick={() => connectMutation.mutate(token.trim())}>{connectMutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Github className="size-3.5" />} Connect GitHub</Button></div><p className="text-right font-mono text-[10px] text-[#6E7681]" data-testid="settings-session-note">{healthQuery.data?.github_connected ? "A GitHub token is active on this backend session." : "No GitHub token is configured."}</p></div></div></div>}

      {deployOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080C14]/80 p-4 backdrop-blur-sm" data-testid="deploy-dialog-overlay"><div className="w-full max-w-lg rounded-xl border border-[#30363D] bg-[#161B22] shadow-[0_12px_50px_rgba(0,0,0,0.6)]" role="dialog" aria-modal="true" data-testid="deploy-dialog"><div className="flex items-start justify-between border-b border-[#30363D] px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#3FB950]" data-testid="deploy-eyebrow">Real GitHub Actions dispatch</p><h2 className="mt-1 text-base font-semibold text-[#F0F6FC]" data-testid="deploy-title">Run a workflow</h2></div><Button type="button" size="icon-sm" variant="ghost" data-testid="deploy-close-button" onClick={() => setDeployOpen(false)}><X className="size-4" /></Button></div><div className="space-y-5 p-5"><div className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E7681]" data-testid="deploy-repository-label">Repository</p><p className="mt-1 text-sm font-semibold text-[#C9D1D9]" data-testid="deploy-repository-value">{activeRepository?.full_name}</p></div><div><p className="mb-2 text-xs font-medium text-[#C9D1D9]" data-testid="deploy-workflow-label">Workflow</p><div className="space-y-1.5">{workflowsQuery.data?.workflows.filter((workflow) => workflow.can_dispatch).map((workflow) => <button type="button" key={workflow.id} data-testid={`deploy-workflow-${workflow.id}-button`} onClick={() => setSelectedWorkflowId(workflow.id)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#58A6FF] ${selectedWorkflowId === workflow.id ? "border-[#58A6FF]/60 bg-[#2F81F7]/10" : "border-[#30363D] bg-[#0D1117] hover:bg-[#21262D]"}`}><span className="flex min-w-0 items-center gap-2.5"><Workflow className="size-3.5 shrink-0 text-[#58A6FF]" /><span className="truncate text-xs text-[#C9D1D9]" data-testid={`deploy-workflow-name-${workflow.id}`}>{workflow.name}</span></span>{selectedWorkflowId === workflow.id && <Check className="size-3.5 text-[#58A6FF]" />}</button>)}{!workflowsQuery.data?.workflows.some((workflow) => workflow.can_dispatch) && <p className="rounded-lg border border-dashed border-[#30363D] px-3 py-4 text-xs text-[#8B949E]" data-testid="deploy-no-dispatchable-workflow">No active workflow with dispatch support was returned by GitHub.</p>}</div></div><div><label htmlFor="deploy-branch" className="mb-2 block text-xs font-medium text-[#C9D1D9]" data-testid="deploy-branch-label">Branch or ref</label><div className="relative"><GitBranch className="absolute left-2.5 top-2.5 size-3.5 text-[#6E7681]" /><Input id="deploy-branch" value={branch} onChange={(event) => setBranch(event.target.value)} data-testid="deploy-branch-input" className="border-[#30363D] bg-[#0D1117] pl-8 text-[#F0F6FC]" placeholder="main" /></div></div><div className="flex items-center justify-between gap-3 border-t border-[#30363D] pt-4"><p className="max-w-xs text-[10px] leading-relaxed text-[#6E7681]" data-testid="deploy-disclaimer"><LockKeyhole className="mr-1 inline size-3" /> This calls GitHub Actions directly. A run will appear in the monitor after GitHub queues it.</p><Button type="button" data-testid="deploy-submit-button" disabled={!selectedWorkflowId || !branch.trim() || dispatchMutation.isPending} onClick={() => activeRepository && selectedWorkflowId && dispatchMutation.mutate({ workflowId: selectedWorkflowId, repositoryId: activeRepository.id, ref: branch.trim() })}>{dispatchMutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Dispatch workflow</Button></div></div></div></div>}
    </div>
  );
}
