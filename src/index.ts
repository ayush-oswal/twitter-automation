#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import server from './server.js';

async function main() {
  console.error('Starting Twitter Automation MCP Server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Twitter Automation MCP Server started successfully!');
  console.error('Available tools: generateImages, addImageFromUrl, uploadImages, postTweet');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 