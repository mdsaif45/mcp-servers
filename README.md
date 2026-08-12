# MyProject MCP Servers

Model Context Protocol (MCP) servers for the MyProject project, providing Claude with direct access to your codebase, database, and development tools.

## Overview

This directory contains two MCP servers that extend Claude Desktop's capabilities:

| Server | Purpose | Status | Tools |
|--------|---------|--------|-------|
| **mysql-mcp** | MySQL database access | ✅ Ready | Query DB, list tables, describe schemas, analyze relationships |
| **dev-mcp** | Development tools | ✅ Ready | Find code, search files, Docker ops, Git info, run commands |

## Quick Start

**New to MCP?** Start here: [QUICK_START.md](./QUICK_START.md)

**Need detailed setup?** See: [SETUP.md](./SETUP.md)

## What Are MCP Servers?

MCP (Model Context Protocol) servers allow Claude to interact with external systems. Think of them as plugins that give Claude superpowers:

- 🗄️ **Direct database access** - Query your MyProject database without leaving Claude
- 🔍 **Code search** - Find files, controllers, and patterns across your codebase
- 🐳 **Docker management** - Check container status and services
- 📝 **Git operations** - View branches, commits, and status
- ⚡ **Custom commands** - Run PowerShell scripts and system commands

## Installation

### Prerequisites
- Node.js v18+
- Claude Desktop app
- Access to MyProject project

### One-Time Setup

1. Both servers are already built and ready to use!
2. Copy the configuration to Claude Desktop (see [QUICK_START.md](./QUICK_START.md))
3. Restart Claude Desktop
4. Start using the tools!

## Usage Examples

### Database Queries
```
"Show me all users in the database"
"Describe the Projects table"
"Count tasks created this week"
```

### Code Analysis
```
"Find all API controllers"
"Search for 'EmailService' in the codebase"
"List all WebAPI projects"
```

### DevOps
```
"Show running Docker containers"
"What's the current Git branch?"
"Find all configuration files"
```

## Server Details

### mysql-mcp

**Location:** `mysql-mcp/`

**Tools:**
- `query` - Execute read-only SQL queries
- `list-tables` - List all database tables
- `describe-table` - Get table schema
- `show-indexes` - View table indexes
- `show-foreign-keys` - Analyze relationships
- `count-rows` - Count records
- `database-info` - Get DB metadata

**Documentation:** [mysql-mcp/README.md](./mysql-mcp/README.md)

### dev-mcp

**Location:** `dev-mcp/`

**Tools:**
- `find-projects` - Find C# projects
- `find-controllers` - Locate API controllers
- `search-code` - Search codebase
- `docker-ps` - List Docker containers
- `git-info` - Git status and history
- `find-configs` - Find config files
- `read-docs` - Access documentation
- `run-powershell` - Execute PowerShell commands
- `env-info` - Environment versions

**Documentation:** [dev-mcp/README.md](./dev-mcp/README.md)

## Development

### Building from Source

```bash
# Build mysql-mcp
cd mysql-mcp
npm install
npm run build

# Build dev-mcp
cd ../dev-mcp
npm install
npm run build
```

### Watch Mode (Development)

```bash
cd dev-mcp
npm run dev  # Auto-rebuild on changes
```

### Adding New Tools

1. Edit `src/index.ts` in either server
2. Add a new `server.registerTool(...)` call
3. Rebuild: `npm run build`
4. Restart Claude Desktop

## Configuration

### Environment Variables

**mysql-mcp:**
- `MYSQL_HOST` - Database host
- `MYSQL_PORT` - Database port
- `MYSQL_USER` - Database username
- `MYSQL_PASSWORD` - Database password
- `MYSQL_DATABASE` - Database name

**dev-mcp:**
- `myproject_PROJECT_ROOT` - Path to MyProject_Core directory

### Claude Desktop Config

The configuration file location varies by OS:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

See [claude_desktop_config.json](./claude_desktop_config.json) for a complete example.

## Security

⚠️ **Important Security Notes:**

1. **Database Access:** The MySQL server only allows read-only operations (SELECT, SHOW, DESCRIBE)
2. **Credentials:** Keep your config file secure - it contains database passwords
3. **PowerShell:** The dev server can execute commands - use in trusted environments only
4. **Network:** Ensure database firewall rules are properly configured

## Troubleshooting

### Common Issues

**Servers not appearing in Claude?**
- Check Claude Desktop logs
- Verify paths in config are absolute and correct
- Ensure both servers are built (`dist/index.js` exists)

**Database connection errors?**
- Verify database credentials
- Check network access to MySQL host
- Test connection with `mysql` CLI

**Build failures?**
- Ensure Node.js v18+ is installed
- Try `npm install` again
- Check for port conflicts

**Out of memory during build?**
- The dev server now uses esbuild (fast, low memory)
- If issues persist, increase Node heap: `NODE_OPTIONS=--max-old-space-size=4096`

### Getting Help

1. Check the logs in `%APPDATA%\Claude\logs`
2. Review [SETUP.md](./SETUP.md) for detailed troubleshooting
3. See individual server READMEs for tool-specific help

## Architecture

```
Claude Desktop
    ↓
MCP Protocol (stdio)
    ↓
┌─────────────────┬──────────────────┐
│  mysql-mcp   │   dev-mcp     │
│  (Database)     │   (Dev Tools)    │
└────────┬────────┴────────┬─────────┘
         ↓                 ↓
    MySQL DB         File System
                     Git / Docker
                     PowerShell
```

## Resources

- **MCP Specification:** https://github.com/modelcontextprotocol/specification
- **Claude MCP Guide:** https://docs.anthropic.com/claude/docs/mcp
- **MCP SDK:** https://github.com/modelcontextprotocol/typescript-sdk

## License

Private - MyProject Project

## Maintainers

VegamSolutions

---

**Ready to get started?** → [QUICK_START.md](./QUICK_START.md)
