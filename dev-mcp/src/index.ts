#!/usr/bin/env node
/**
 * MyProject Development MCP Server
 *
 * A lightweight Model Context Protocol server for the MyProject project.
 * Provides tools for codebase analysis, project management, Docker operations, and more.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import { readFileSync, readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

// Project root directory
const PROJECT_ROOT = process.env.MYPROJECT_PROJECT_ROOT || process.cwd();

// Create MCP Server
const server = new McpServer({
  name: 'dev-mcp',
  version: '1.0.0'
});

// Utility function to find files recursively
function findFilesRecursive(dir: string, pattern: RegExp, maxDepth = 10, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);

      // Skip node_modules, obj, bin, dist
      if (file === 'node_modules' || file === 'obj' || file === 'bin' || file === 'dist') {
        continue;
      }

      try {
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          results.push(...findFilesRecursive(filePath, pattern, maxDepth, currentDepth + 1));
        } else if (pattern.test(file)) {
          results.push(filePath);
        }
      } catch {}
    }
  } catch {}

  return results;
}

// ==================== CODEBASE ANALYSIS TOOLS ====================

/**
 * Find all .csproj files in the MyProject solution
 */
server.registerTool(
  'find-projects',
  {
    title: 'Find C# Projects',
    description: 'Find all .csproj files in the MyProject solution with optional filtering',
    inputSchema: {
      pattern: z.string().optional().describe('Optional pattern to filter projects (e.g., "WebAPI")'),
      includeTests: z.boolean().optional().default(true).describe('Include test projects')
    },
    outputSchema: {
      projects: z.array(z.object({
        name: z.string(),
        path: z.string(),
        relativePath: z.string(),
        isTest: z.boolean()
      })),
      count: z.number()
    }
  },
  async ({ pattern, includeTests }) => {
    const files = findFilesRecursive(PROJECT_ROOT, /\.csproj$/);

    let projects = files.map(file => {
      const relativePath = path.relative(PROJECT_ROOT, file);
      const name = path.basename(file, '.csproj');
      const isTest = name.toLowerCase().includes('test') || name.toLowerCase().includes('tests');

      return { name, path: file, relativePath, isTest };
    });

    // Filter by pattern if provided
    if (pattern) {
      projects = projects.filter(p => p.name.includes(pattern) || p.relativePath.includes(pattern));
    }

    // Filter by tests
    if (!includeTests) {
      projects = projects.filter(p => !p.isTest);
    }

    const output = { projects, count: projects.length };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

/**
 * Find API Controllers
 */
server.registerTool(
  'find-controllers',
  {
    title: 'Find API Controllers',
    description: 'Find all API controllers in the MyProject solution',
    inputSchema: {
      project: z.string().optional().describe('Filter by project name (e.g., "MyProject_Admin")')
    },
    outputSchema: {
      controllers: z.array(z.object({
        name: z.string(),
        path: z.string(),
        project: z.string()
      })),
      count: z.number()
    }
  },
  async ({ project }) => {
    const files = findFilesRecursive(PROJECT_ROOT, /Controller\.cs$/);

    let controllers = files
      .filter(file => file.includes('Controllers'))
      .map(file => {
        const relativePath = path.relative(PROJECT_ROOT, file);
        const name = path.basename(file, '.cs');
        const projectMatch = relativePath.match(/^([^\/\\]+)/);
        const projectName = projectMatch ? projectMatch[1] : 'Unknown';

        return { name, path: file, project: projectName };
      });

    // Filter by project if provided
    if (project) {
      controllers = controllers.filter(c => c.project.includes(project));
    }

    const output = { controllers, count: controllers.length };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

/**
 * Search code in the codebase
 */
server.registerTool(
  'search-code',
  {
    title: 'Search Code',
    description: 'Search for a pattern in the MyProject codebase (.cs files)',
    inputSchema: {
      pattern: z.string().describe('Search pattern (string)'),
      maxResults: z.number().optional().default(50).describe('Maximum number of results')
    },
    outputSchema: {
      results: z.array(z.object({
        file: z.string(),
        line: z.number(),
        content: z.string()
      })),
      count: z.number(),
      truncated: z.boolean()
    }
  },
  async ({ pattern, maxResults }) => {
    const files = findFilesRecursive(PROJECT_ROOT, /\.cs$/);

    const results: { file: string; line: number; content: string }[] = [];
    let totalFound = 0;

    for (const file of files.slice(0, 500)) { // Limit files to search
      if (totalFound >= maxResults!) break;

      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineContent, index) => {
          if (totalFound >= maxResults!) return;

          if (lineContent.includes(pattern)) {
            results.push({
              file: path.relative(PROJECT_ROOT, file),
              line: index + 1,
              content: lineContent.trim()
            });
            totalFound++;
          }
        });
      } catch {}
    }

    const output = {
      results,
      count: results.length,
      truncated: totalFound >= maxResults!
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

// ==================== DOCKER & DEVOPS TOOLS ====================

/**
 * List running Docker containers
 */
server.registerTool(
  'docker-ps',
  {
    title: 'List Docker Containers',
    description: 'List all running Docker containers related to MyProject',
    inputSchema: {
      all: z.boolean().optional().default(false).describe('Show all containers (including stopped)')
    },
    outputSchema: {
      containers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        image: z.string(),
        status: z.string(),
        ports: z.string()
      })),
      count: z.number()
    }
  },
  async ({ all }) => {
    try {
      const command = all
        ? 'docker ps -a --format "{{json .}}"'
        : 'docker ps --format "{{json .}}"';

      const { stdout } = await execAsync(command);

      const containers = stdout
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => {
          const container = JSON.parse(line);
          return {
            id: container.ID,
            name: container.Names,
            image: container.Image,
            status: container.Status,
            ports: container.Ports || ''
          };
        });

      const output = { containers, count: containers.length };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
      };
    } catch (error: any) {
      throw new Error(`Docker command failed: ${error.message}`);
    }
  }
);

// ==================== GIT & PROJECT INFO TOOLS ====================

/**
 * Get Git branch information
 */
server.registerTool(
  'git-info',
  {
    title: 'Git Information',
    description: 'Get current Git branch, status, and recent commits',
    inputSchema: {
      commitCount: z.number().optional().default(5).describe('Number of recent commits to show')
    },
    outputSchema: {
      branch: z.string(),
      status: z.string(),
      recentCommits: z.array(z.object({
        hash: z.string(),
        author: z.string(),
        date: z.string(),
        message: z.string()
      }))
    }
  },
  async ({ commitCount }) => {
    try {
      // Get current branch
      const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT });
      const branch = branchOutput.trim();

      // Get status
      const { stdout: statusOutput } = await execAsync('git status --short', { cwd: PROJECT_ROOT });
      const status = statusOutput.trim() || 'Clean working directory';

      // Get recent commits
      const { stdout: logOutput } = await execAsync(
        `git log -${commitCount} --format="%H|%an|%ai|%s"`,
        { cwd: PROJECT_ROOT }
      );

      const recentCommits = logOutput
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => {
          const [hash, author, date, message] = line.split('|');
          return { hash, author, date, message };
        });

      const output = { branch, status, recentCommits };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
      };
    } catch (error: any) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }
);

/**
 * Find configuration files
 */
server.registerTool(
  'find-configs',
  {
    title: 'Find Configuration Files',
    description: 'Find appsettings.json, launchSettings.json, and other config files',
    inputSchema: {
      configType: z.enum(['appsettings', 'launch', 'docker', 'all']).optional().default('all')
        .describe('Type of config files to find')
    },
    outputSchema: {
      configs: z.array(z.object({
        name: z.string(),
        path: z.string(),
        type: z.string()
      })),
      count: z.number()
    }
  },
  async ({ configType }) => {
    let files: string[] = [];

    if (configType === 'appsettings' || configType === 'all') {
      files.push(...findFilesRecursive(PROJECT_ROOT, /appsettings.*\.json$/));
    }

    if (configType === 'launch' || configType === 'all') {
      files.push(...findFilesRecursive(PROJECT_ROOT, /launchSettings\.json$/));
    }

    if (configType === 'docker' || configType === 'all') {
      files.push(...findFilesRecursive(PROJECT_ROOT, /docker-compose.*\.yml$/));
    }

    const configs = files.map(file => {
      const relativePath = path.relative(PROJECT_ROOT, file);
      const name = path.basename(file);
      let type = 'other';

      if (name.includes('appsettings')) type = 'appsettings';
      else if (name.includes('launchSettings')) type = 'launch';
      else if (name.includes('docker-compose')) type = 'docker';

      return { name, path: relativePath, type };
    });

    const output = { configs, count: configs.length };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

/**
 * Read documentation
 */
server.registerTool(
  'read-docs',
  {
    title: 'Read Documentation',
    description: 'Find and read documentation files in the docs folder',
    inputSchema: {
      filename: z.string().optional().describe('Specific documentation file to read')
    },
    outputSchema: {
      files: z.array(z.object({
        name: z.string(),
        path: z.string(),
        preview: z.string()
      })),
      count: z.number()
    }
  },
  async ({ filename }) => {
    let files: string[] = [];

    if (filename) {
      const docFiles = findFilesRecursive(PROJECT_ROOT, new RegExp(filename));
      files = docFiles.filter(f => f.includes('docs') || f.endsWith('.md'));
    } else {
      files = findFilesRecursive(PROJECT_ROOT, /\.md$/).filter(f => f.includes('docs'));
    }

    const docs = files.slice(0, 10).map(file => {
      const relativePath = path.relative(PROJECT_ROOT, file);
      const name = path.basename(file);

      let preview = '';
      try {
        const content = readFileSync(file, 'utf-8');
        preview = content.substring(0, 200) + '...';
      } catch {
        preview = 'Unable to read file';
      }

      return { name, path: relativePath, preview };
    });

    const output = { files: docs, count: docs.length };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

// ==================== UTILITY TOOLS ====================

/**
 * Execute a custom PowerShell command
 */
server.registerTool(
  'run-powershell',
  {
    title: 'Run PowerShell Command',
    description: 'Execute a PowerShell command in the project directory',
    inputSchema: {
      command: z.string().describe('PowerShell command to execute'),
      timeout: z.number().optional().default(30000).describe('Command timeout in milliseconds')
    },
    outputSchema: {
      stdout: z.string(),
      stderr: z.string(),
      exitCode: z.number().optional()
    }
  },
  async ({ command, timeout }) => {
    try {
      const { stdout, stderr } = await execAsync(
        `powershell -Command "${command.replace(/"/g, '\\"')}"`,
        { cwd: PROJECT_ROOT, timeout }
      );

      const output = {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
      };
    } catch (error: any) {
      const output = {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
      };
    }
  }
);

/**
 * Get environment info
 */
server.registerTool(
  'env-info',
  {
    title: 'Environment Information',
    description: 'Get information about the development environment (Node, .NET, Docker versions)',
    inputSchema: {},
    outputSchema: {
      node: z.string().optional(),
      dotnet: z.string().optional(),
      docker: z.string().optional(),
      platform: z.string()
    }
  },
  async () => {
    const output: any = {
      platform: process.platform
    };

    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      output.node = nodeVersion.trim();
    } catch {}

    try {
      const { stdout: dotnetVersion } = await execAsync('dotnet --version');
      output.dotnet = dotnetVersion.trim();
    } catch {}

    try {
      const { stdout: dockerVersion } = await execAsync('docker --version');
      output.docker = dockerVersion.trim();
    } catch {}

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MyProject Development MCP Server started');
  console.error(`Project root: ${PROJECT_ROOT}`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
