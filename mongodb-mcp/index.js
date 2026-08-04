import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MongoClient } from "mongodb";

// Configuration from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_HOST = process.env.MONGODB_HOST || "127.0.0.1";
const MONGODB_PORT = process.env.MONGODB_PORT || "27017";
const MONGODB_USER = process.env.MONGODB_USER;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_AUTH_SOURCE = process.env.MONGODB_AUTH_SOURCE || "admin";
const DEFAULT_DATABASE = process.env.MONGODB_DATABASE;

// Build URI if MONGODB_URI is not directly specified
let connectionUri = MONGODB_URI;
if (!connectionUri) {
  if (MONGODB_USER && MONGODB_PASSWORD) {
    const encodedUser = encodeURIComponent(MONGODB_USER);
    const encodedPass = encodeURIComponent(MONGODB_PASSWORD);
    connectionUri = `mongodb://${encodedUser}:${encodedPass}@${MONGODB_HOST}:${MONGODB_PORT}/?authSource=${MONGODB_AUTH_SOURCE}`;
  } else {
    connectionUri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}`;
  }
}

// Singleton connection client
let clientInstance = null;

async function getConnectedClient() {
  if (!clientInstance) {
    clientInstance = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await clientInstance.connect();
  }
  return clientInstance;
}

function resolveDatabase(client, targetDb) {
  if (targetDb && targetDb.trim() !== "") {
    return client.db(targetDb.trim());
  }
  if (DEFAULT_DATABASE && DEFAULT_DATABASE.trim() !== "") {
    return client.db(DEFAULT_DATABASE.trim());
  }
  // Try extracting database from URI path if present
  try {
    const url = new URL(connectionUri.startsWith("mongodb://") || connectionUri.startsWith("mongodb+srv://") 
      ? connectionUri 
      : `mongodb://${connectionUri}`);
    const pathname = url.pathname.replace(/^\//, "");
    if (pathname) {
      return client.db(pathname);
    }
  } catch (_) {
    // Ignore URL parse error and fall back
  }
  return client.db(); // Default DB from connection string or server default
}

function parseJson(input, defaultValue = {}) {
  if (input === undefined || input === null || input === "") {
    return defaultValue;
  }
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch (e) {
      throw new Error(`Failed to parse JSON string: ${e.message}`);
    }
  }
  return input;
}

// Create MCP Server instance
const server = new McpServer({
  name: "mongodb-mcp",
  version: "1.0.0",
});

// Tool 1: list_databases
server.tool(
  "list_databases",
  "List all available databases on the connected MongoDB instance.",
  {},
  async () => {
    try {
      const client = await getConnectedClient();
      const adminDb = client.db().admin();
      const result = await adminDb.listDatabases();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error listing databases: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 2: list_collections
server.tool(
  "list_collections",
  "List all collections in a given database (or default configured database).",
  {
    database: z.string().optional().describe("Database name (optional, defaults to configured database)"),
  },
  async ({ database }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c) => ({
        name: c.name,
        type: c.type || "collection",
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collectionCount: collections.length,
                collections: collectionNames,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error listing collections: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 3: find_documents
server.tool(
  "find_documents",
  "Query and find documents in a MongoDB collection. Accepts optional filter JSON, projection, sort, limit, and skip.",
  {
    collection: z.string().describe("Target collection name"),
    database: z.string().optional().describe("Target database name (optional)"),
    filter: z
      .union([z.string(), z.record(z.any())])
      .optional()
      .default("{}")
      .describe("MongoDB filter query as JSON string or object (e.g. {\"status\": \"ACTIVE\"})"),
    projection: z
      .union([z.string(), z.record(z.any())])
      .optional()
      .describe("Fields to return as JSON string or object (e.g. {\"_id\": 0, \"name\": 1})"),
    sort: z
      .union([z.string(), z.record(z.any())])
      .optional()
      .describe("Sort order as JSON string or object (e.g. {\"createdAt\": -1})"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum number of documents to return (default 50, max 500)"),
    skip: z
      .number()
      .optional()
      .default(0)
      .describe("Number of documents to skip for pagination (default 0)"),
  },
  async ({ collection, database, filter, projection, sort, limit, skip }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const queryFilter = parseJson(filter, {});
      const queryProj = projection ? parseJson(projection) : undefined;
      const querySort = sort ? parseJson(sort) : undefined;

      const maxLimit = Math.min(Math.max(1, limit || 50), 500);

      let cursor = db.collection(collection).find(queryFilter);

      if (queryProj) cursor = cursor.project(queryProj);
      if (querySort) cursor = cursor.sort(querySort);
      if (skip && skip > 0) cursor = cursor.skip(skip);
      cursor = cursor.limit(maxLimit);

      const documents = await cursor.toArray();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collection,
                returnedCount: documents.length,
                limit: maxLimit,
                skip: skip || 0,
                documents,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error finding documents: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 4: count_documents
server.tool(
  "count_documents",
  "Count documents in a collection matching a query filter.",
  {
    collection: z.string().describe("Target collection name"),
    database: z.string().optional().describe("Target database name (optional)"),
    filter: z
      .union([z.string(), z.record(z.any())])
      .optional()
      .default("{}")
      .describe("MongoDB filter query as JSON string or object (e.g. {\"status\": \"ACTIVE\"})"),
  },
  async ({ collection, database, filter }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const queryFilter = parseJson(filter, {});

      const count = await db.collection(collection).countDocuments(queryFilter);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collection,
                count,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error counting documents: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 5: aggregate
server.tool(
  "aggregate",
  "Execute a read-only aggregation pipeline on a collection.",
  {
    collection: z.string().describe("Target collection name"),
    database: z.string().optional().describe("Target database name (optional)"),
    pipeline: z
      .union([z.string(), z.array(z.any())])
      .describe("Aggregation pipeline stages as JSON string or array of objects"),
  },
  async ({ collection, database, pipeline }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const stages = parseJson(pipeline, []);

      if (!Array.isArray(stages)) {
        return {
          content: [{ type: "text", text: "Error: Aggregation pipeline must be an array of stages." }],
          isError: true,
        };
      }

      // Security check: reject any write stages in aggregation
      const forbiddenStages = ["$out", "$merge", "$writeStage"];
      for (const stage of stages) {
        if (typeof stage === "object" && stage !== null) {
          const keys = Object.keys(stage);
          for (const key of keys) {
            if (forbiddenStages.includes(key.toLowerCase())) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Error: Stage '${key}' is prohibited in read-only aggregate mode.`,
                  },
                ],
                isError: true,
              };
            }
          }
        }
      }

      const results = await db.collection(collection).aggregate(stages).toArray();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collection,
                resultCount: results.length,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error running aggregation: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 6: get_collection_stats
server.tool(
  "get_collection_stats",
  "Get statistics for a collection including document count, storage size, and index details.",
  {
    collection: z.string().describe("Target collection name"),
    database: z.string().optional().describe("Target database name (optional)"),
  },
  async ({ collection, database }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const coll = db.collection(collection);

      const count = await coll.countDocuments();
      const indexes = await coll.indexes();
      let stats = {};
      try {
        stats = await db.command({ collStats: collection });
      } catch (_) {
        // collStats command might require additional permissions or vary by Mongo version
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collection,
                documentCount: count,
                indexes,
                sizeBytes: stats.size,
                storageSizeBytes: stats.storageSize,
                avgObjSizeBytes: stats.avgObjSize,
                indexCount: indexes.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error getting collection stats: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool 7: sample_schema
server.tool(
  "sample_schema",
  "Analyze sample documents in a collection to infer field names and data types.",
  {
    collection: z.string().describe("Target collection name"),
    database: z.string().optional().describe("Target database name (optional)"),
    sampleSize: z
      .number()
      .optional()
      .default(50)
      .describe("Number of documents to sample for schema analysis (default 50)"),
  },
  async ({ collection, database, sampleSize }) => {
    try {
      const client = await getConnectedClient();
      const db = resolveDatabase(client, database);
      const size = Math.min(Math.max(1, sampleSize || 50), 100);

      const docs = await db.collection(collection).find().limit(size).toArray();

      if (docs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                database: db.databaseName,
                collection,
                sampledDocuments: 0,
                fields: {},
                message: "Collection is empty.",
              }, null, 2),
            },
          ],
        };
      }

      const fieldMap = {};

      function getTypeName(val) {
        if (val === null) return "Null";
        if (val === undefined) return "Undefined";
        if (Array.isArray(val)) return "Array";
        if (val instanceof Date) return "Date";
        if (typeof val === "object") {
          if (val._bsontype === "ObjectId" || val.constructor?.name === "ObjectId") return "ObjectId";
          return "Object";
        }
        return typeof val;
      }

      function analyzeObject(obj, prefix = "") {
        for (const [key, val] of Object.entries(obj)) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;
          if (!fieldMap[fieldPath]) {
            fieldMap[fieldPath] = { types: new Set(), occurrences: 0 };
          }
          fieldMap[fieldPath].occurrences += 1;
          const typeName = getTypeName(val);
          fieldMap[fieldPath].types.add(typeName);

          if (typeName === "Object" && val && Object.keys(val).length > 0) {
            analyzeObject(val, fieldPath);
          }
        }
      }

      for (const doc of docs) {
        analyzeObject(doc);
      }

      const fieldsSummary = {};
      for (const [path, info] of Object.entries(fieldMap)) {
        fieldsSummary[path] = {
          types: Array.from(info.types),
          presence: `${info.occurrences}/${docs.length} docs (${Math.round((info.occurrences / docs.length) * 100)}%)`,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: db.databaseName,
                collection,
                sampledDocuments: docs.length,
                fields: fieldsSummary,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error analyzing schema: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Connect Stdio Transport
const transport = new StdioServerTransport();
await server.connect(transport);
