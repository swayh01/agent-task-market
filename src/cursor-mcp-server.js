#!/usr/bin/env node
/**
 * Cursor MCP Server for OpenClaw / Agent Task Marketplace
 * 
 * This MCP server allows Cursor to interact with:
 * - OpenClaw system
 * - Agent Task Marketplace
 * - Local workspace
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/Users/ggyy/.openclaw/workspace';

// MCP Server Setup
const server = new Server(
  {
    name: 'openclaw-cursor-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool Definitions
const TOOLS = [
  {
    name: 'openclaw_status',
    description: 'Check OpenClaw system status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'openclaw_fix',
    description: 'Run OpenClaw repair bot to fix issues',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'atm_publish_task',
    description: 'Publish a task to Agent Task Marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        reward: { type: 'string', description: 'Reward amount (e.g., 0.5)' },
      },
      required: ['title', 'description', 'reward'],
    },
  },
  {
    name: 'atm_list_tasks',
    description: 'List available tasks on Agent Task Marketplace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'workspace_read_file',
    description: 'Read a file from the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to file' },
      },
      required: ['path'],
    },
  },
  {
    name: 'workspace_write_file',
    description: 'Write content to a file in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to file' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'memory_search',
    description: 'Search OpenClaw memory for past information',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'qmd_search',
    description: 'Search QMD knowledge base',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'openclaw_status': {
        const output = execSync('openclaw status', { encoding: 'utf8', timeout: 10000 });
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'openclaw_fix': {
        const output = execSync('node ~/.openclaw/workspace/skills/repair-bot/repair-bot.js check', {
          encoding: 'utf8',
          timeout: 30000,
        });
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'atm_publish_task': {
        const { title, description, reward } = args;
        const output = execSync(
          `node ${WORKSPACE}/skills/agent-task-market/src/agent-task-market.js publish "${title}" "${description}" ${reward}`,
          { encoding: 'utf8', timeout: 10000 }
        );
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'atm_list_tasks': {
        const output = execSync(
          `node ${WORKSPACE}/skills/agent-task-market/src/agent-task-market.js list`,
          { encoding: 'utf8', timeout: 10000 }
        );
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'workspace_read_file': {
        const filePath = path.join(WORKSPACE, args.path);
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'workspace_write_file': {
        const filePath = path.join(WORKSPACE, args.path);
        fs.writeFileSync(filePath, args.content);
        return {
          content: [{ type: 'text', text: `File written: ${args.path}` }],
        };
      }

      case 'memory_search': {
        const output = execSync(
          `cd ${WORKSPACE} && qmd vsearch "${args.query}" --json 2>/dev/null || echo "Search completed"`,
          { encoding: 'utf8', timeout: 10000 }
        );
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'qmd_search': {
        const output = execSync(
          `cd ${WORKSPACE} && qmd vsearch "${args.query}" --json 2>/dev/null || echo "Search completed"`,
          { encoding: 'utf8', timeout: 10000 }
        );
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OpenClaw MCP Server running on stdio');
}

main().catch(console.error);
