# MyProject MCP Servers - Quick Start Guide

## What You Have

You now have **two powerful MCP servers** ready to use with Claude Desktop:

### 1. **mysql-mcp** - MySQL Database Access
✅ Already built and configured
Provides tools for querying the MyProject database

### 2. **dev-mcp** - Development Tools
✅ **Just created!**
Provides codebase analysis, Docker management, Git operations, and more

---

## Installation (5 minutes)

### Step 1: Locate Your Claude Desktop Config

Find your Claude Desktop configuration file:

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Copy the Configuration

Open the config file and paste this configuration (replace existing content or merge if you have other servers):

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "node",
      "args": [
        "D:\\VegamProjects\\MyProject\\MyProject_Core\\mcp-servers\\mysql-mcp\\dist\\index.js"
      ],
      "env": {
        "MYSQL_HOST": "YOUR_DB_HOST",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "YOUR_DB_USER",
        "MYSQL_PASSWORD": "YOUR_PASSWORD",
        "MYSQL_DATABASE": "myproject"
      }
    },
    "dev-mcp": {
      "command": "node",
      "args": [
        "D:\\VegamProjects\\MyProject\\MyProject_Core\\mcp-servers\\dev-mcp\\dist\\index.js"
      ],
      "env": {
        "myproject_PROJECT_ROOT": "D:\\VegamProjects\\MyProject\\MyProject_Core"
      }
    }
  }
}
```

**⚠️ Important:** Update the paths to match your system!
- Change `D:\\VegamProjects\\MyProject\\` to your actual project path
- Use double backslashes (`\\`) for Windows paths
- Or use forward slashes (`/`) which work on all platforms

### Step 3: Restart Claude Desktop

1. Completely quit Claude Desktop
2. Start it again
3. The MCP servers will be available automatically

---

## Quick Test

After restarting Claude Desktop, try these commands:

### Test mysql-mcp:
```
List all tables in the MyProject database
```

### Test dev-mcp:
```
Find all WebAPI projects in the solution
```

If both work, you're all set! 🎉

---

## What Can You Do Now?

### 📊 Database Operations (mysql-mcp)
- Query the database: "Show me all users created in the last week"
- Analyze schemas: "Describe the Projects table structure"
- Count records: "How many tasks are in the database?"
- View relationships: "Show foreign keys for the Users table"

### 🔍 Codebase Analysis (dev-mcp)
- Find code: "Search for 'DbContext' in the codebase"
- List controllers: "Show all API controllers in the Admin project"
- Find projects: "List all non-test C# projects"
- Find configs: "Find all appsettings files"

### 🐳 Docker Management (dev-mcp)
- "List all running Docker containers"
- "Show Docker Compose services"

### 📝 Git Operations (dev-mcp)
- "What branch am I on?"
- "Show the last 10 commits"
- "What's the git status?"

### 📚 Documentation (dev-mcp)
- "Find all markdown files in docs"
- "Read the security audit report"

### ⚡ Power Commands (dev-mcp)
- Run PowerShell: "Execute 'dotnet --version'"
- Get environment info: "Show development environment versions"

---

## Troubleshooting

### Servers Not Showing Up?

1. **Check the logs:**
   - Windows: `%APPDATA%\Claude\logs`
   - macOS: `~/Library/Logs/Claude`

2. **Verify builds:**
   ```bash
   # Check if dist/index.js exists
   dir MyProject_Core\mcp-servers\mysql-mcp\dist\index.js
   dir MyProject_Core\mcp-servers\dev-mcp\dist\index.js
   ```

3. **Test manually:**
   ```bash
   node MyProject_Core/mcp-servers/dev-mcp/dist/index.js
   ```
   It should show: "MyProject Development MCP Server started"
   Press Ctrl+C to exit

### Path Issues?

Use forward slashes that work everywhere:
```json
"D:/VegamProjects/MyProject/MyProject_Core/mcp-servers/dev-mcp/dist/index.js"
```

### Database Connection Issues?

Update the credentials in the config:
```json
"env": {
  "MYSQL_HOST": "your-host",
  "MYSQL_USER": "your-username",
  "MYSQL_PASSWORD": "your-password",
  "MYSQL_DATABASE": "myproject"
}
```

---

## Next Steps

1. **Explore the tools** - Try different queries and commands
2. **Read the docs** - See `SETUP.md` for detailed information
3. **Customize** - Edit the server code in `src/index.ts` to add your own tools

## File Locations

```
MyProject_Core/mcp-servers/
├── mysql-mcp/          # MySQL database server
│   ├── dist/index.js      # Built server (ALREADY EXISTS)
│   ├── src/index.ts       # Source code
│   └── README.md          # Documentation
│
├── dev-mcp/            # Development tools server
│   ├── dist/index.js      # Built server (JUST CREATED ✓)
│   ├── src/index.ts       # Source code
│   └── README.md          # Documentation
│
├── claude_desktop_config.json  # Config template
├── SETUP.md               # Detailed setup guide
└── QUICK_START.md         # This file!
```

---

## Need Help?

- **Detailed setup:** See `SETUP.md`
- **Tool reference:** See `dev-mcp/README.md` and `mysql-mcp/README.md`
- **MCP docs:** https://github.com/modelcontextprotocol/specification

---

**Happy coding! 🚀**
