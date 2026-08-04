import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import oracledb from "oracledb";

const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
};

const server = new McpServer({
  name: "oracle-query-mcp",
  version: "1.0.0",
});

// Tool 1: Execute a SELECT query
server.tool(
  "query",
  "Execute a SELECT query against the Oracle database. Returns rows and column metadata.",
  {
    sql: z.string().describe("SELECT SQL statement to execute"),
    maxRows: z
      .number()
      .optional()
      .default(200)
      .describe("Maximum number of rows to return (default 200)"),
  },
  async ({ sql, maxRows }) => {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT")) {
      return {
        content: [{ type: "text", text: "Error: Only SELECT queries are allowed." }],
      };
    }

    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(sql, [], {
        maxRows: maxRows ?? 200,
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                columns: result.metaData?.map((m) => m.name),
                rows: result.rows,
                rowCount: result.rows?.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    } finally {
      if (connection) await connection.close();
    }
  }
);

// Tool 2: Get schema — list tables or columns
server.tool(
  "get_schema",
  "List all tables for a schema owner, or get column details for a specific table.",
  {
    owner: z.string().describe("Schema/owner name, e.g. HR"),
    tableName: z
      .string()
      .optional()
      .describe("Table name to inspect columns (optional). Omit to list all tables."),
  },
  async ({ owner, tableName }) => {
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      let result;

      if (tableName) {
        result = await connection.execute(
          `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
           FROM ALL_TAB_COLUMNS
           WHERE OWNER = :owner AND TABLE_NAME = :table
           ORDER BY COLUMN_ID`,
          { owner: owner.toUpperCase(), table: tableName.toUpperCase() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } else {
        result = await connection.execute(
          `SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = :owner ORDER BY TABLE_NAME`,
          { owner: owner.toUpperCase() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { rows: result.rows, rowCount: result.rows?.length },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    } finally {
      if (connection) await connection.close();
    }
  }
);

// Tool 3: Execute an INSERT statement (two-phase: summary → confirmed execute)
server.tool(
  "execute_insert",
  [
    "⚠️  WRITE OPERATION — use only when absolutely required and no other approach exists.",
    "ALWAYS call with confirmed=false FIRST. This returns a plain-English summary of the",
    "INSERT for the human to review. It does NOT touch the database.",
    "ONLY call again with confirmed=true after the human user has explicitly approved the",
    "summary shown in the first call. Never skip the confirmation step.",
    "Use bind variables in :bindName style inside sql and pass values in the binds object.",
  ].join(" "),
  {
    sql: z
      .string()
      .describe("INSERT INTO … SQL statement using :bindName placeholders for all values"),
    binds: z
      .record(z.union([z.string(), z.number(), z.null()]))
      .optional()
      .default({})
      .describe("Key/value map of bind variable values, e.g. { id: 1, name: 'Alice' }"),
    reason: z
      .string()
      .describe("Plain-English explanation of why this insert is needed — shown in the approval summary"),
    confirmed: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true ONLY after the human has approved the summary from confirmed=false call"),
  },
  async ({ sql, binds, reason, confirmed }) => {
    const trimmed = sql.trim().toUpperCase();

    if (!trimmed.startsWith("INSERT")) {
      return {
        content: [{ type: "text", text: "Error: execute_insert only accepts INSERT statements." }],
      };
    }

    // Block any statement that contains a semicolon-separated second statement
    if (trimmed.includes(";")) {
      return {
        content: [{ type: "text", text: "Error: Multiple statements are not allowed." }],
      };
    }

    // Phase 1 — build and return approval summary without touching DB
    if (!confirmed) {
      const bindSummary = Object.entries(binds ?? {})
        .map(([k, v]) => `  :${k} = ${v === null ? "NULL" : JSON.stringify(v)}`)
        .join("\n");

      const summary = [
        "=== INSERT APPROVAL REQUIRED ===",
        "",
        `Reason : ${reason}`,
        "",
        `SQL    : ${sql}`,
        "",
        "Bind values:",
        bindSummary || "  (none)",
        "",
        "⚠️  This will write a new row to the database.",
        "To execute, call execute_insert again with confirmed=true.",
        "To cancel, do nothing.",
      ].join("\n");

      return { content: [{ type: "text", text: summary }] };
    }

    // Phase 2 — execute after human approved
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(sql, binds ?? {}, { autoCommit: false });
      await connection.commit();

      return {
        content: [
          {
            type: "text",
            text: [
              "✅ INSERT executed successfully.",
              `Rows affected : ${result.rowsAffected}`,
              `Reason        : ${reason}`,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      if (connection) {
        try { await connection.rollback(); } catch (_) {}
      }
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    } finally {
      if (connection) await connection.close();
    }
  }
);

// Tool 4: Execute an UPDATE statement (two-phase: summary → confirmed execute)
server.tool(
  "execute_update",
  [
    "⚠️  WRITE OPERATION — use only when absolutely required and no other approach exists.",
    "UPDATE without a WHERE clause is always rejected — it would modify every row.",
    "Prefer querying with SELECT first to confirm the target rows before updating.",
    "ALWAYS call with confirmed=false FIRST. This returns a plain-English summary of the",
    "UPDATE for the human to review. It does NOT touch the database.",
    "ONLY call again with confirmed=true after the human user has explicitly approved the",
    "summary shown in the first call. Never skip the confirmation step.",
    "Use bind variables in :bindName style inside sql and pass values in the binds object.",
  ].join(" "),
  {
    sql: z
      .string()
      .describe("UPDATE … SET … WHERE … SQL statement using :bindName placeholders for all values"),
    binds: z
      .record(z.union([z.string(), z.number(), z.null()]))
      .optional()
      .default({})
      .describe("Key/value map of bind variable values, e.g. { status: 'DONE', id: 42 }"),
    reason: z
      .string()
      .describe("Plain-English explanation of why this update is needed — shown in the approval summary"),
    confirmed: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true ONLY after the human has approved the summary from confirmed=false call"),
  },
  async ({ sql, binds, reason, confirmed }) => {
    const trimmed = sql.trim().toUpperCase();

    if (!trimmed.startsWith("UPDATE")) {
      return {
        content: [{ type: "text", text: "Error: execute_update only accepts UPDATE statements." }],
      };
    }

    // Hard block: UPDATE without WHERE would wipe the whole table
    if (!trimmed.includes("WHERE")) {
      return {
        content: [
          {
            type: "text",
            text: "Error: UPDATE without a WHERE clause is not allowed. Add a WHERE condition to target specific rows.",
          },
        ],
      };
    }

    // Block multi-statement
    if (trimmed.includes(";")) {
      return {
        content: [{ type: "text", text: "Error: Multiple statements are not allowed." }],
      };
    }

    // Phase 1 — build and return approval summary without touching DB
    if (!confirmed) {
      const bindSummary = Object.entries(binds ?? {})
        .map(([k, v]) => `  :${k} = ${v === null ? "NULL" : JSON.stringify(v)}`)
        .join("\n");

      const summary = [
        "=== UPDATE APPROVAL REQUIRED ===",
        "",
        `Reason : ${reason}`,
        "",
        `SQL    : ${sql}`,
        "",
        "Bind values:",
        bindSummary || "  (none)",
        "",
        "⚠️  This will modify existing rows in the database.",
        "To execute, call execute_update again with confirmed=true.",
        "To cancel, do nothing.",
      ].join("\n");

      return { content: [{ type: "text", text: summary }] };
    }

    // Phase 2 — execute after human approved
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(sql, binds ?? {}, { autoCommit: false });
      await connection.commit();

      return {
        content: [
          {
            type: "text",
            text: [
              "✅ UPDATE executed successfully.",
              `Rows affected : ${result.rowsAffected}`,
              `Reason        : ${reason}`,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      if (connection) {
        try { await connection.rollback(); } catch (_) {}
      }
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    } finally {
      if (connection) await connection.close();
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
