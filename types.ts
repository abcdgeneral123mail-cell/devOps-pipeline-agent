export interface HealthResponse {
  ok: boolean;
  github_connected: boolean;
  ollama_configured: boolean;
  ollama_model: string;
}

export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface GithubConnection {
  connected: boolean;
  user: GithubUser | null;
  message: string;
}

export interface Repository {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  visibility: string | null;
  updated_at: string | null;
  connection_status: string;
  last_indexed_commit: string | null;
  last_indexed_at: string | null;
}

export interface RepositoryList {
  connected: boolean;
  repositories: Repository[];
  message: string | null;
}

export interface RepositoryFile {
  path: string;
  type: string;
  size: number | null;
  sha: string | null;
}

export interface FileTreeResponse {
  repository_id: number;
  commit_sha: string | null;
  truncated: boolean;
  files_count: number;
  files: RepositoryFile[];
  index_status: string;
}

export interface IndexStatus {
  repository_id: number;
  status: string;
  files_count: number;
  chunks_count: number;
  commit_sha: string | null;
  indexed_at: string | null;
  message: string | null;
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  can_dispatch: boolean;
  updated_at: string | null;
}

export interface WorkflowList {
  repository_id: number;
  workflows: Workflow[];
  message: string | null;
}

export interface WorkflowDispatchResponse {
  accepted: boolean;
  workflow_id: number;
  ref: string;
  message: string;
}

export interface PipelineRun {
  id: number;
  name: string;
  workflow_name: string | null;
  event: string | null;
  branch: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  status: string | null;
  conclusion: string | null;
  created_at: string | null;
  updated_at: string | null;
  run_started_at: string | null;
  run_number: number | null;
  html_url: string | null;
}

export interface PipelineList {
  repository_id: number;
  runs: PipelineRun[];
  message: string | null;
}

export interface PipelineStep {
  name: string;
  number: number | null;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface PipelineJob {
  id: number;
  name: string;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: PipelineStep[];
}

export interface PipelineDetail {
  repository_id: number;
  run: PipelineRun;
  jobs: PipelineJob[];
}

export interface ChatSource {
  path: string;
  snippet: string;
}

export interface ChatResponse {
  ai_available: boolean;
  answer: string | null;
  message: string | null;
  sources: ChatSource[];
  indexed_commit: string | null;
  session_id: string;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  aiAvailable?: boolean;
  message?: string;
}