import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { TwitterAutomation } from './TwitterAutomation.js';

// Create global instance of TwitterAutomation
const twitterAutomation = new TwitterAutomation();

const server = new Server(
  {
    name: 'twitter-automation-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generateImages',
        description: 'Generate an image using AI based on a text prompt. Each call generates one image that gets stored for later use. Images can be attached to specific tweets in a thread.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt to generate an image from',
            },
            aspectRatio: {
              type: 'string',
              enum: ['SQUARE', 'LANDSCAPE', 'PORTRAIT'],
              description: 'The aspect ratio of the generated image (default: LANDSCAPE)',
              default: 'LANDSCAPE',
            },
            personGeneration: {
              type: 'string',
              enum: ['ALLOW_ADULT', 'ALLOW_MINOR', 'DISALLOW_ALL'],
              description: 'Person generation policy (default: ALLOW_ADULT)',
              default: 'ALLOW_ADULT',
            },
            threadNumber: {
              type: 'number',
              description: 'Which tweet in the thread to attach this image to. 0 = main tweet, 1 = first thread tweet, 2 = second thread tweet, etc. (default: 0)',
              default: 0,
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'addImageFromUrl',
        description: 'Add an image from a URL to a specific thread position. Downloads and stores the image for later use.',
        inputSchema: {
          type: 'object',
          properties: {
            imageUrl: {
              type: 'string',
              description: 'The URL of the image to download and add',
            },
            threadNumber: {
              type: 'number',
              description: 'Which tweet in the thread to attach this image to. 0 = main tweet, 1 = first thread tweet, etc.',
              default: 0,
            },
          },
          required: ['imageUrl'],
        },
      },
      {
        name: 'uploadImages',
        description: 'Upload all previously generated/added images to Twitter. This prepares them for use in tweets.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'postTweet',
        description: 'Post a tweet with optional images and thread support. Can handle formatted text with emojis and proper threading.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The main tweet content with formatting, emojis, etc.',
            },
            threadContent: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Optional array of additional tweets to create a thread',
            },
          },
          required: ['content'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generateImages': {
        const { prompt, aspectRatio = 'LANDSCAPE', personGeneration = 'ALLOW_ADULT', threadNumber = 0 } = args as {
          prompt: string;
          aspectRatio?: 'SQUARE' | 'LANDSCAPE' | 'PORTRAIT';
          personGeneration?: 'ALLOW_ADULT' | 'ALLOW_MINOR' | 'DISALLOW_ALL';
          threadNumber?: number;
        };

        if (!prompt) {
          throw new McpError(ErrorCode.InvalidParams, 'Prompt is required for image generation');
        }

        const imagePath = await twitterAutomation.generateImage({
          prompt,
          aspectRatio,
          personGeneration,
          threadNumber,
        });

        const state = twitterAutomation.getState();

        return {
          content: [
            {
              type: 'text',
                          text: JSON.stringify({
              success: true,
              message: 'Image generated successfully',
              imagePath,
              threadNumber,
              totalImagesGenerated: state.totalImages,
              threadsWithImages: state.threadsWithImages,
              prompt,
              aspectRatio,
              personGeneration,
            }, null, 2),
            },
          ],
        };
      }

      case 'addImageFromUrl': {
        const { imageUrl, threadNumber = 0 } = args as {
          imageUrl: string;
          threadNumber?: number;
        };

        if (!imageUrl) {
          throw new McpError(ErrorCode.InvalidParams, 'Image URL is required');
        }

        const imagePath = await twitterAutomation.addImageFromUrl(threadNumber, imageUrl);
        const state = twitterAutomation.getState();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Image added from URL successfully',
                imagePath,
                imageUrl,
                threadNumber,
                totalImages: state.totalImages,
                threadsWithImages: state.threadsWithImages,
              }, null, 2),
            },
          ],
        };
      }

      case 'uploadImages': {
        const mediaIdsMap = await twitterAutomation.uploadImages();
        const state = twitterAutomation.getState();
        const totalUploadedImages = Array.from(mediaIdsMap.values()).reduce((total, mediaIds) => total + mediaIds.length, 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Successfully uploaded ${totalUploadedImages} images to Twitter`,
                mediaIdsByThread: Object.fromEntries(mediaIdsMap),
                uploadedCount: totalUploadedImages,
                threadsWithImages: Array.from(mediaIdsMap.keys()).sort(),
                readyForTweet: totalUploadedImages > 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'postTweet': {
        const { content, threadContent } = args as {
          content: string;
          threadContent?: string[];
        };

        if (!content) {
          throw new McpError(ErrorCode.InvalidParams, 'Tweet content is required');
        }

        const result = await twitterAutomation.postTweet({
          content,
          threadContent,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Tweet posted successfully!',
                mainTweetId: result.mainTweet.id,
                totalTweets: result.totalTweets,
                isThread: (threadContent && threadContent.length > 0),
                threadTweetIds: result.threadTweets.map((t: any) => t.id),
                content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
            tool: name,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Error handling
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

export default server; 