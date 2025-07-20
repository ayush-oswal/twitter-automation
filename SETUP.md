# Setup Guide

## Prerequisites

- Node.js 18+
- Twitter Developer Account  
- Google AI Studio Account

## Step 1: Get API Keys

### Twitter API Keys & Tokens

Follow this comprehensive guide to generate your Twitter API credentials:
👉 **[Generate Twitter API Keys & Tokens](https://www.ryancarmody.dev/blog/generate-twitter-api-keys-and-tokens)**

**Important**: Ensure your Twitter app has **Read & Write** permissions. After changing permissions, you **must regenerate** your Access Token and Access Token Secret.

### Google AI Studio API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key for your project

## Step 2: Install & Configure

```bash
# Clone and install
git clone <your-repo>
cd twitter-automation
npm install

# Configure environment
cp env.example .env
```

Edit `.env`:
```env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token  
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
GOOGLE_AI_API_KEY=your_google_ai_api_key
IMAGE_STORAGE_PATH=./images
```

## Step 3: Build & Test

```bash
# Build the project
npm run build

# Test the server
npm start
```

If successful, you'll see:
```
Twitter Automation MCP Server started successfully!
Available tools: generateImages, addImageFromUrl, postTweet
```

## Step 4: Configure Claude Desktop

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this configuration:
```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "node",
      "args": ["C:\\full\\path\\to\\twitter-automation\\dist\\index.js"]
    }
  }
}
```

**Notes:**
- Use **full absolute paths** 
- Use **double backslashes** (`\\`) on Windows
- Replace with your actual project path

## Step 5: Restart Claude Desktop

Restart Claude Desktop completely for the MCP server to load.

## Troubleshooting

**"403 Forbidden"**: Your Twitter app lacks proper permissions. Ensure Read & Write access and regenerate tokens.

**"Cannot find module"**: Verify the path in your MCP config points to the built `dist/index.js` file.

**"ENOENT .env"**: Make sure your `.env` file exists in the project root with all required keys.

**MCP not loading**: Check Claude Desktop logs for specific error messages.

## Verification

Test in Claude Desktop:
```
Generate an image of a sunset and post this tweet: "Testing my MCP server! 🌅"
```

If successful, you'll see a tweet posted to your Twitter account with the generated image. 