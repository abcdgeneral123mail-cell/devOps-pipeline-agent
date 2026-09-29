# DevOps Pipeline Agent — living spec

## MVP behavior

DevOps Pipeline Agent is a dark, chat-first workspace that connects to GitHub with a backend-only personal access token. It lists the real repositories available to that token, lets the user select one as isolated context, reads its real GitHub tree and readable files, and stores the indexed content in MongoDB for repository-aware retrieval.

The workspace discovers real GitHub Actions workflows, dispatches workflows that GitHub accepts, polls/listens to real workflow runs, and shows actual run details, jobs, steps, and log availability. It never fabricates repositories, pipeline data, logs, incidents, or AI answers.

Ollama is an optional local provider. If it is unavailable, chat returns a clear unavailable state plus any real indexed source references. The current MVP does not automatically modify or push repository code.

## Data model

- `index_status`: repository id, real tree commit SHA, status, file/chunk counts, timestamps, and indexing message.
- `repository_files`: repository id, path, GitHub blob SHA, size, indexed commit, actual file content, and deterministic chunks.
- `chat_messages`: repository id, session id, role, content, and timestamp.

Repository and Actions metadata is fetched live from GitHub and is not seeded.

## Key flows

1. Open Settings → enter a GitHub PAT → backend validates it with `/user`, then keeps it in server memory only.
2. Repository selector loads live repositories from GitHub and makes one repository active.
3. Index Repository retrieves the real recursive tree and readable file contents, skipping secrets, binaries, generated folders, and oversized files.
4. Ask the Agent retrieves relevant indexed files and sends only those labeled sources to Ollama. The response displays the files actually used.
5. Workflows panel lists live Actions workflows. Deploy/Run Workflow dispatches a real workflow with the chosen branch/ref.
6. Pipeline Monitor lists real workflow runs. Selecting one loads GitHub jobs and steps; logs are fetched only when GitHub provides them.

## Auth and roles

There is no application login or role system in the MVP. GitHub authorization comes from the PAT entered in Settings. The PAT is never returned to the frontend, placed in browser storage, or sent to Ollama.

## Intentional MVP limitations

- The current template uses MongoDB rather than PostgreSQL/pgvector; retrieval is deterministic lexical retrieval over real indexed files.
- PAT state is server-memory scoped and is cleared on backend restart or disconnect.
- Hindsight incidents, similarity search, and risk scoring are not yet exposed because the requested MVP focuses on the live GitHub/index/chat/workflow loop.