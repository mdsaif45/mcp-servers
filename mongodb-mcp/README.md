# MongoDB MCP Server (`mongodb-mcp`)

A read-only Model Context Protocol (MCP) server providing Claude and Antigravity with secure, read-only inspection and query tools for MongoDB databases.

## Features

- 🔒 **Strict Read-Only Safety**: Only supports read queries, document counting, aggregation analysis, and collection/database metadata.
- 🌐 **Flexible Connection Configuration**: Connects using standard `MONGODB_URI` connection strings or individual host/port/auth fallback environment variables.
- ⚡ **Auto-JSON Parsing**: Accepts query filters, projections, sort descriptors, and aggregation pipelines either as formatted JSON strings or nested JSON objects.

## Installed Tools

| Tool Name | Description |
|-----------|-------------|
| `list_databases` | List all available databases and storage stats on the MongoDB instance |
| `list_collections` | List all collections in a given database |
| `find_documents` | Query documents matching a filter with optional projection, sorting, skip, and limit |
| `count_documents` | Count documents matching a query filter |
| `aggregate` | Execute read-only aggregation pipelines (rejects `$out`, `$merge`, etc.) |
| `get_collection_stats` | Retrieve document count, index definitions, and storage statistics for a collection |
| `sample_schema` | Analyze sample documents to infer field paths, data types, and nullability percentages |

## Configuration

Add the server to your `claude_desktop_config.json` or Antigravity MCP settings:

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "node",
      "args": [
        "D:\\my-quests\\ai-projects\\mcp-servers\\mongodb-mcp\\index.js"
      ],
      "env": {
        "MONGODB_URI": "mongodb://USER:PASSWORD@HOST:27017/?authSource=admin",
        "MONGODB_DATABASE": "admin"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | Full MongoDB connection URI | *(Optional if HOST/PORT specified)* |
| `MONGODB_HOST` | Database host IP or hostname | `YOUR_DB_HOST` |
| `MONGODB_PORT` | Database port | `27017` |
| `MONGODB_USER` | Username for auth | - |
| `MONGODB_PASSWORD` | Password for auth | - |
| `MONGODB_AUTH_SOURCE` | Auth database source | `admin` |
| `MONGODB_DATABASE` | Default database name to use | - |

## Installation & Setup

```bash
cd D:\my-quests\ai-projects\mcp-servers\mongodb-mcp
npm install
```
