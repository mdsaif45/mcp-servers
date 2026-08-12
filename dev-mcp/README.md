# DevProject Development MCP Server

A comprehensive Model Context Protocol (MCP) server for the DevProject project that provides tools for codebase analysis, project management, Docker operations, and development workflows.

## Features

This MCP server provides the following capabilities:

### 🔍 Codebase Analysis
- **find-projects** - Find all C# projects (.csproj files) with optional filtering
- **analyze-project** - Analyze project files to extract dependencies, frameworks, and configuration
- **find-controllers** - Find all API controllers in the solution
- **search-code** - Search for patterns in the codebase with regex support

### 🐳 Docker & DevOps
- **docker-ps** - List running Docker containers
- **docker-compose-services** - List services defined in docker-compose files

### 📂 Git & Project Info
- **git-info** - Get current Git branch, status, and recent commits
- **project-structure** - Get a high-level overview of the project structure
- **find-configs** - Find configuration files (appsettings.json, launchSettings.json, etc.)
- **read-docs** - Find and read documentation files

### 🛠️ Utilities
- **run-powershell** - Execute custom PowerShell commands in the project directory
- **env-info** - Get development environment information (Node, .NET, Docker versions)

## Installation

### 1. Install Dependencies

```bash
cd DevProject_Core/mcp-servers/dev-mcp
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Claude Desktop

Add the following configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dev-mcp": {
      "command": "node",
      "args": [
        "D:\\VegamProjects\\DevProject\\DevProject_Core\\mcp-servers\\dev-mcp\\dist\\index.js"
      ],
      "env": {
        "devproject_PROJECT_ROOT": "D:\\VegamProjects\\DevProject\\DevProject_Core"
      }
    }
  }
}
```

> **Note**: Update the paths according to your project location.

## Usage Examples

### Find All WebAPI Projects

```typescript
// Use the find-projects tool
{
  "pattern": "*WebAPI*",
  "includeTests": false
}
```

### Analyze a Specific Project

```typescript
// Use the analyze-project tool
{
  "projectPath": "DevProject_Admin/DevProject_Admin_WebAPI/DevProject_Admin_WebAPI.csproj"
}
```

### Search for a Specific Code Pattern

```typescript
// Use the search-code tool
{
  "pattern": "DbContext",
  "filePattern": "**/*.cs",
  "maxResults": 20
}
```

### Check Docker Containers

```typescript
// Use the docker-ps tool
{
  "all": true
}
```

### Get Git Information

```typescript
// Use the git-info tool
{
  "commitCount": 10
}
```

## Development

### Watch Mode

For development, you can run the TypeScript compiler in watch mode:

```bash
npm run dev
```

### Testing

You can test the server locally using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Environment Variables

- **devproject_PROJECT_ROOT** - The root directory of the DevProject project (default: current working directory)

## Tools Reference

### Codebase Analysis Tools

#### find-projects
Find all C# projects in the solution.

**Parameters:**
- `pattern` (optional): Glob pattern to filter projects
- `includeTests` (optional, default: true): Include test projects

**Returns:** List of projects with names, paths, and metadata

#### analyze-project
Analyze a .csproj file to extract information.

**Parameters:**
- `projectPath`: Path to the .csproj file

**Returns:** Project details including dependencies, target framework, and references

#### find-controllers
Find all API controllers in the solution.

**Parameters:**
- `project` (optional): Filter by project name

**Returns:** List of controllers with names and locations

#### search-code
Search for code patterns.

**Parameters:**
- `pattern`: Search pattern (string or regex)
- `filePattern` (optional): File pattern to search in
- `maxResults` (optional, default: 50): Maximum results

**Returns:** Matching code snippets with file paths and line numbers

### Docker & DevOps Tools

#### docker-ps
List Docker containers.

**Parameters:**
- `all` (optional, default: false): Show all containers including stopped

**Returns:** List of containers with status information

#### docker-compose-services
List Docker Compose services.

**Parameters:**
- `composeFile` (optional): Path to docker-compose file

**Returns:** List of service names

### Git & Project Info Tools

#### git-info
Get Git repository information.

**Parameters:**
- `commitCount` (optional, default: 5): Number of recent commits

**Returns:** Current branch, status, and recent commits

#### project-structure
Get project directory structure.

**Parameters:**
- `depth` (optional, default: 2): Directory depth

**Returns:** Directory tree structure

#### find-configs
Find configuration files.

**Parameters:**
- `configType` (optional): Type of configs ('appsettings', 'launch', 'docker', 'all')

**Returns:** List of configuration files

#### read-docs
Find and read documentation.

**Parameters:**
- `filename` (optional): Specific doc file to read

**Returns:** List of documentation files with previews

### Utility Tools

#### run-powershell
Execute PowerShell commands.

**Parameters:**
- `command`: PowerShell command to run
- `timeout` (optional, default: 30000): Timeout in milliseconds

**Returns:** Command output (stdout, stderr, exit code)

#### env-info
Get environment information.

**Returns:** Versions of Node.js, .NET, Docker, and platform info

## License

Private - DevProject Project

## Author

VegamSolutions
