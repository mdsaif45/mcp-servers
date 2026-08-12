# MyProject MCP Servers Setup Guide

This guide will help you set up the MyProject Model Context Protocol (MCP) servers for use with Claude Desktop.

## Available MCP Servers

### 1. **mysql-mcp** - MySQL Database Server
Provides direct access to the MyProject MySQL database with tools for:
- Executing SQL queries (read-only)
- Listing tables and describing schemas
- Analyzing table relationships and indexes
- Getting row counts and database statistics

### 2. **dev-mcp** - Development Tools Server
Provides comprehensive development tools for:
- **Codebase Analysis**: Find projects, controllers, search code
- **Docker Management**: List containers and compose services
- **Git Operations**: Branch info, status, recent commits
- **Project Navigation**: Find configs, read docs, analyze structure

## Prerequisites

- Node.js (v18 or higher)
- Claude Desktop application
- Access to the MyProject project repository

## Installation Steps

### Step 1: Build the MCP Servers

```bash
# Navigate to the mysql-mcp server
cd MyProject_Core/mcp-servers/mysql-mcp
npm install
npm run build

# Navigate to the dev-mcp server
cd ../dev-mcp
npm install
npm run build
```

### Step 2: Configure Claude Desktop

1. Locate your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Copy the configuration from `claude_desktop_config.json` in this directory

3. **Update the paths** in the configuration to match your system:
   - Update all `D:\\VegamProjects\\MyProject\\` paths to your actual project location
   - Ensure paths use proper escaping for your OS (double backslashes for Windows)

4. **Configure database credentials** (for mysql-mcp):
   - Update `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - Ensure the MySQL server is accessible from your machine

### Step 3: Restart Claude Desktop

After updating the configuration file:
1. Completely quit Claude Desktop (not just close the window)
2. Restart Claude Desktop
3. The MCP servers should now be available

## Verification

To verify the servers are working:

### Test mysql-mcp
Ask Claude:
```
Use the mysql-mcp server to list all tables in the database
```

### Test dev-mcp
Ask Claude:
```
Use the dev-mcp server to find all WebAPI projects in the solution
```

## Configuration Reference

### Complete Configuration Example

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

## Troubleshooting

### Server Not Showing in Claude Desktop

1. **Check the logs**: Claude Desktop logs are usually in:
   - Windows: `%APPDATA%\Claude\logs`
   - macOS: `~/Library/Logs/Claude`

2. **Verify the build**: Make sure both servers have been built successfully:
   ```bash
   ls MyProject_Core/mcp-servers/mysql-mcp/dist/index.js
   ls MyProject_Core/mcp-servers/dev-mcp/dist/index.js
   ```

3. **Test manually**: Run the server directly to check for errors:
   ```bash
   node MyProject_Core/mcp-servers/dev-mcp/dist/index.js
   ```

### Database Connection Issues

1. **Check network access**: Ensure the MySQL server is accessible from your machine
   ```bash
   ping YOUR_DB_HOST
   ```

2. **Verify credentials**: Test the connection using a MySQL client
   ```bash
   mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p myproject
   ```

3. **Firewall settings**: Ensure port 3306 is not blocked

### Path Issues on Windows

- Always use double backslashes (`\\`) in JSON configuration
- Example: `"D:\\VegamProjects\\MyProject\\MyProject_Core"`
- Or use forward slashes: `"D:/VegamProjects/MyProject/MyProject_Core"`

### Node.js Version

Ensure you're using a compatible Node.js version:
```bash
node --version  # Should be v18 or higher
```

## Usage Examples

### Using mysql-mcp

```plaintext
"Show me the schema of the Users table"
"List all tables in the database"
"Count how many records are in the Projects table"
"Show foreign key relationships for the Tasks table"
```

### Using dev-mcp

```plaintext
"Find all API controllers in the Admin project"
"Search for 'DbContext' in the codebase"
"List all running Docker containers"
"Show me the recent git commits"
"Find all appsettings files"
"Analyze the MyProject_Admin_WebAPI project"
```

## Development Mode

For development, you can run the servers in watch mode:

```bash
# Terminal 1 - mysql-mcp
cd MyProject_Core/mcp-servers/mysql-mcp
npm run dev

# Terminal 2 - dev-mcp
cd MyProject_Core/mcp-servers/dev-mcp
npm run dev
```

This will automatically rebuild the servers when you make changes to the source code.

## Security Notes

⚠️ **Important Security Considerations**:

1. **Database Credentials**: The `claude_desktop_config.json` contains database credentials. Keep this file secure and do not commit it to version control.

2. **Read-Only Access**: The mysql-mcp server only allows SELECT queries for safety. Write operations are blocked.

3. **PowerShell Execution**: The dev-mcp server can execute PowerShell commands. Only use it in trusted environments.

4. **Network Access**: Ensure your database server has proper firewall rules and is not exposed to public internet.

## Updating the Servers

When you make changes to the server code:

1. Rebuild the server:
   ```bash
   cd MyProject_Core/mcp-servers/dev-mcp  # or mysql-mcp
   npm run build
   ```

2. Restart Claude Desktop to load the changes

## Support

For issues or questions:
- Check the README.md in each server directory
- Review the Claude Desktop documentation
- Contact the development team

## Additional Resources

- [MCP Protocol Documentation](https://github.com/modelcontextprotocol/specification)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- MyProject MySQL Server: `MyProject_Core/mcp-servers/mysql-mcp/README.md`
- MyProject Dev Server: `MyProject_Core/mcp-servers/dev-mcp/README.md`
