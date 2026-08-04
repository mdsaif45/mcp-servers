import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "redis";

// Configuration from environment variables. Credentials have no fallback —
// they must be supplied by the environment.
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_USER = process.env.REDIS_USER || 'default';
const REDIS_CONNECTION_STRING = process.env.REDIS_CONNECTION_STRING;

// Construct URL if explicit connection string isn't provided. Credentials are
// omitted entirely when no password is set, and percent-encoded otherwise so
// special characters survive the URL.
const auth = REDIS_PASSWORD
  ? `${encodeURIComponent(REDIS_USER)}:${encodeURIComponent(REDIS_PASSWORD)}@`
  : '';
const url = REDIS_CONNECTION_STRING || `redis://${auth}${REDIS_HOST}:${REDIS_PORT}`;

// Create Redis client
const redisClient = createClient({
  url: url
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
await redisClient.connect();

// Create MCP Server
const server = new Server(
  {
    name: "redis-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "redis_get",
        description: "Get the value of a string key in Redis",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The Redis key to get" },
          },
          required: ["key"],
        },
      },
      {
        name: "redis_keys",
        description: "Find all keys matching the given pattern",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Pattern to match keys (e.g., * or user:*)" },
          },
          required: ["pattern"],
        },
      },
      {
        name: "redis_hgetall",
        description: "Get all fields and values of a hash stored at key",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The Redis hash key" },
          },
          required: ["key"],
        },
      },
      {
        name: "redis_type",
        description: "Determine the type stored at key",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The Redis key" },
          },
          required: ["key"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (name === "redis_get") {
      const key = args.key;
      const value = await redisClient.get(key);
      return {
        content: [{ type: "text", text: value !== null ? value : "(nil)" }],
      };
    } 
    
    if (name === "redis_keys") {
      const pattern = args.pattern;
      const keys = await redisClient.keys(pattern);
      return {
        content: [{ type: "text", text: JSON.stringify(keys, null, 2) }],
      };
    }

    if (name === "redis_hgetall") {
      const key = args.key;
      const result = await redisClient.hGetAll(key);
      return {
        content: [{ type: "text", text: Object.keys(result).length === 0 ? "(empty hash)" : JSON.stringify(result, null, 2) }],
      };
    }
    
    if (name === "redis_type") {
      const key = args.key;
      const type = await redisClient.type(key);
      return {
        content: [{ type: "text", text: type }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
