# Deploying these MCP servers on a Linux host

These are **stdio** MCP servers: the MCP client spawns each one as a local child
process and talks over stdin/stdout. They cannot be reached over a network by
config alone — the code must exist on the machine where Claude Code runs. Hence
clone-per-host.

## 1. Clone

```bash
git clone https://github.com/mdsaif45/mcp-servers.git ~/mcp-servers
cd ~/mcp-servers
```

## 2. Install dependencies

```bash
for d in oracle-query-mcp redis-mcp mongodb-mcp; do (cd "$d" && npm install --omit=dev); done
(cd mysql-mcp && npm install && npm run build)   # TypeScript: needs devDeps + build
```

`mysql-mcp` compiles to `dist/index.js`, which is gitignored — you must run
`npm run build` on every host.

## 3. Supply credentials

Never put real passwords in the MCP config JSON. Keep them in a private env file:

```bash
cp .env.example .env
chmod 600 .env      # owner-only
$EDITOR .env
```

## 4. Register the servers

Claude Code expands `${VAR}` in `env` values, so the config stays secret-free.
See `claude_desktop_config.example.json` for the full shape, and register with:

```bash
claude mcp add <name> --scope user --env KEY='${KEY}' -- node /home/saif/mcp-servers/<dir>/index.js
```

Load the env file in the same shell that launches Claude Code:

```bash
set -a && . ~/mcp-servers/.env && set +a
claude
```

To make that automatic, add those two `set -a` lines to `~/.bashrc`.

## Notes / gotchas

- **Oracle**: `oracledb` 6.x defaults to **Thin mode**, needing no Oracle Instant
  Client. If you switch to Thick mode you must install Instant Client separately.
- **Paths**: stdio configs hardcode absolute paths, so they differ per host.
- All four servers are **read-only** by design; keep it that way.
- Databases must be reachable from this host — check firewalls before debugging
  the MCP layer.
