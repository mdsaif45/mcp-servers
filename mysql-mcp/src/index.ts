#!/usr/bin/env node
/**
 * MySQL MCP Server
 *
 * A generic Model Context Protocol server for querying a MySQL database.
 * Provides tools for executing SQL queries, describing tables, and listing database objects.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as mysql from 'mysql2/promise';
import * as z from 'zod';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'default_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

// Create connection pool
let pool: mysql.Pool;

async function getPool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Create MCP Server
const server = new McpServer({
  name: 'mysql-mcp',
  version: '1.0.0'
});

// Tool: Execute SQL Query
server.registerTool(
  'query',
  {
    title: 'Execute SQL Query',
    description: 'Execute a read-only SQL query against the MySQL database. Only SELECT statements are allowed for safety.',
    inputSchema: {
      sql: z.string().describe('The SQL SELECT query to execute'),
      params: z.array(z.any()).optional().describe('Optional query parameters for prepared statements')
    },
    outputSchema: {
      rows: z.array(z.record(z.any())),
      rowCount: z.number(),
      fields: z.array(z.string())
    }
  },
  async ({ sql, params }) => {
    // Safety check: only allow SELECT queries
    const trimmedSql = sql.trim().toUpperCase();
    if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('SHOW') && !trimmedSql.startsWith('DESCRIBE') && !trimmedSql.startsWith('EXPLAIN')) {
      throw new Error('Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed for safety.');
    }

    const connection = await getPool();
    const [rows, fields] = await connection.execute(sql, params || []);

    const resultRows = rows as mysql.RowDataPacket[];
    const fieldNames = (fields as mysql.FieldPacket[]).map(f => f.name);

    const output = {
      rows: resultRows,
      rowCount: resultRows.length,
      fields: fieldNames
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: List Tables
server.registerTool(
  'list-tables',
  {
    title: 'List Database Tables',
    description: 'List all tables in the database',
    inputSchema: {},
    outputSchema: {
      tables: z.array(z.string()),
      count: z.number()
    }
  },
  async () => {
    const connection = await getPool();
    const [rows] = await connection.execute('SHOW TABLES');

    const tables = (rows as mysql.RowDataPacket[]).map(row => Object.values(row)[0] as string);

    const output = {
      tables,
      count: tables.length
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: Describe Table
server.registerTool(
  'describe-table',
  {
    title: 'Describe Table Structure',
    description: 'Get the structure/schema of a specific table including columns, types, and constraints',
    inputSchema: {
      tableName: z.string().describe('Name of the table to describe')
    },
    outputSchema: {
      tableName: z.string(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        nullable: z.boolean(),
        key: z.string(),
        defaultValue: z.any(),
        extra: z.string()
      }))
    }
  },
  async ({ tableName }) => {
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name format');
    }

    const connection = await getPool();
    const [rows] = await connection.execute(`DESCRIBE \`${tableName}\``);

    const columns = (rows as mysql.RowDataPacket[]).map(row => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      key: row.Key || '',
      defaultValue: row.Default,
      extra: row.Extra || ''
    }));

    const output = { tableName, columns };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: Get Table Indexes
server.registerTool(
  'show-indexes',
  {
    title: 'Show Table Indexes',
    description: 'Get all indexes defined on a specific table',
    inputSchema: {
      tableName: z.string().describe('Name of the table to show indexes for')
    },
    outputSchema: {
      tableName: z.string(),
      indexes: z.array(z.record(z.any()))
    }
  },
  async ({ tableName }) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name format');
    }

    const connection = await getPool();
    const [rows] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);

    const output = {
      tableName,
      indexes: rows as mysql.RowDataPacket[]
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: Get Foreign Keys
server.registerTool(
  'show-foreign-keys',
  {
    title: 'Show Foreign Keys',
    description: 'Get all foreign key relationships for a specific table',
    inputSchema: {
      tableName: z.string().describe('Name of the table to show foreign keys for')
    },
    outputSchema: {
      tableName: z.string(),
      foreignKeys: z.array(z.record(z.any()))
    }
  },
  async ({ tableName }) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name format');
    }

    const connection = await getPool();
    const [rows] = await connection.execute(`
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database, tableName]);

    const output = {
      tableName,
      foreignKeys: rows as mysql.RowDataPacket[]
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: Get Table Row Count
server.registerTool(
  'count-rows',
  {
    title: 'Count Table Rows',
    description: 'Get the total number of rows in a specific table',
    inputSchema: {
      tableName: z.string().describe('Name of the table to count rows for'),
      whereClause: z.string().optional().describe('Optional WHERE clause (without WHERE keyword)')
    },
    outputSchema: {
      tableName: z.string(),
      count: z.number()
    }
  },
  async ({ tableName, whereClause }) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name format');
    }

    const connection = await getPool();
    let sql = `SELECT COUNT(*) as count FROM \`${tableName}\``;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    const [rows] = await connection.execute(sql);
    const count = (rows as mysql.RowDataPacket[])[0].count;

    const output = { tableName, count };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Tool: Database Info
server.registerTool(
  'database-info',
  {
    title: 'Database Information',
    description: 'Get general information about the connected database',
    inputSchema: {},
    outputSchema: {
      database: z.string(),
      host: z.string(),
      version: z.string(),
      tableCount: z.number()
    }
  },
  async () => {
    const connection = await getPool();

    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    const version = (versionRows as mysql.RowDataPacket[])[0].version;

    const [tableRows] = await connection.execute('SHOW TABLES');
    const tableCount = (tableRows as mysql.RowDataPacket[]).length;

    const output = {
      database: dbConfig.database,
      host: dbConfig.host,
      version,
      tableCount
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MySQL MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
