import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"; // Zod is now the standard for parameter validation

// 1. Initialize the Server
const server = new McpServer({
  name: "dummy-tools-server",
  version: "1.0.0",
});

// 2. Define the Tools using the modern `registerTool` method
server.registerTool(
  "hello",
  {
    description: "A simple dummy tool that returns a personalized greeting.",
    // This inputSchema automatically generates the "PARAMETERS" UI box!
    // It tells the host app: "I require a string called 'name'."
    inputSchema: z.object({
      name: z.string().describe("The name of the person to greet")
    })
  },
  async (args) => {
    // Because of Zod, 'args' is fully type-safe and guaranteed to have 'args.name'
    return {
      content: [{ type: "text", text: `yo yo 😉, ${args.name}!` }],
    };
  }
);

server.registerTool(
  "bye",
  {
    description: "A simple dummy tool that returns the string xyz.",
    // An empty Zod object means this tool requires zero parameters
    inputSchema: z.object({})
  },
  async () => {
    return {
      content: [{ type: "text", text: "get lost" }],
    };
  }
);

// 3. Start the Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dummy MCP Server running on stdio");
}

main().catch(console.error);


// ====================NEW WAY OF DOING THINGS==================
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// // 1. Initialize the Server using the new McpServer class
// const server = new McpServer({
//   name: "dummy-tools-server",
//   version: "1.0.0",
// });

// // 2. Define the Tools
// // The new API handles tool routing and JSON schema generation automatically!
// server.tool(
//   "say_hello",
//   "A simple dummy tool that returns a greeting.",
//   {}, // Zod schemas for parameters go here (empty object means no parameters)
//   async () => {
//     return {
//       content: [{ type: "text", text: "hello sweety, how can i help you today?" }],
//     };
//   }
// );

// server.tool(
//   "return_xyz",
//   "A simple dummy tool that returns the string xyz.",
//   {},
//   async () => {
//     return {
//       content: [{ type: "text", text: "xyz" }],
//     };
//   }
// );

// // 3. Start the Server
// async function main() {
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
//   console.error("Dummy MCP Server running on stdio");
// }

// main().catch(console.error);


// ===================OLD WAY OF DOING THINGS==================
// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import {
//   CallToolRequestSchema,
//   ListToolsRequestSchema,
// } from "@modelcontextprotocol/sdk/types.js";

// // 1. Initialize the Server
// const server = new Server(
//   {
//     name: "dummy-tools-server",
//     version: "1.0.0",
//   },
//   {
//     capabilities: {
//       tools: {}, // Tell the client we support tools
//     },
//   }
// );

// // 2. Define the Tools (This is what builds your UI!)
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//   return {
//     tools: [
//       {
//         name: "say_hello",
//         description: "A simple dummy tool that returns a greeting.",
//         inputSchema: {
//           type: "object",
//           properties: {}, // No parameters required for this tool
//         },
//       },
//       {
//         name: "return_xyz",
//         description: "A simple dummy tool that returns the string xyz.",
//         inputSchema: {
//           type: "object",
//           properties: {},
//         },
//       },
//     ],
//   };
// });

// // 3. Execute the Tools
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//   if (request.params.name === "say_hello") {
//     return {
//       content: [{ type: "text", text: "hello there" }],
//     };
//   }

//   if (request.params.name === "return_xyz") {
//     return {
//       content: [{ type: "text", text: "xyz" }],
//     };
//   }

//   // Fallback if the AI tries to call a tool that doesn't exist
//   throw new Error(`Tool not found: ${request.params.name}`);
// });

// // 4. Start the Server
// async function main() {
//   // StdioServerTransport allows the server to communicate via standard input/output
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
//   console.error("Dummy MCP Server running on stdio");
// }

// main().catch(console.error);
