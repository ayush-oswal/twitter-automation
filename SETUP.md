# Quick Setup Guide

## Step-by-Step Installation

### 1. Clone and Install

```bash
# Navigate to your project directory
cd twitter-automation

# Install dependencies
npm install

# Create environment file
cp env.example .env
```

### 2. Get Twitter API Keys

1. Visit [developer.twitter.com](https://developer.twitter.com)
2. Create a new app or select existing app
3. Go to "Keys and tokens" section
4. Generate:
   - API Key
   - API Secret Key
   - Access Token
   - Access Token Secret
5. Ensure app permissions are set to "Read and Write"

### 3. Get Google AI Studio API Key

1. Visit [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Navigate to "Get API Key" section
4. Create new API key for your project
5. Copy the key (you won't see it again!)
6. Ensure you have access to Gemini 2.0 Flash with image generation

### 4. Configure Environment

Edit your `.env` file:

```env
TWITTER_API_KEY=your_actual_api_key
TWITTER_API_SECRET=your_actual_api_secret
TWITTER_ACCESS_TOKEN=your_actual_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_actual_access_token_secret
GOOGLE_AI_API_KEY=your_actual_google_ai_key
```

### 5. Build the Project

```bash
npm run build
```

### 6. Configure Claude Desktop

**Windows location**: `%APPDATA%\Claude\claude_desktop_config.json`
**Mac location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Replace `YourName` with your actual Windows username:

```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\Desktop\\coding\\twitter-automation\\dist\\index.js"]
    }
  }
}
```

**Important Notes:**
- Use **double backslashes** (`\\`) for Windows paths in JSON
- Replace `YourName` with your actual Windows username
- Your `.env` file will be automatically loaded! No need to duplicate environment variables.



### 7. Test the Setup

Restart Claude Desktop and try:

```
Can you help me create a tweet about AI? Generate an image of a robot if needed.
```

## Troubleshooting

- **Import errors**: Run `npm install` again
- **Permission errors**: Check Twitter app permissions
- **Path errors**: Use absolute paths in Claude config
- **API errors**: Verify all keys are correct and active
- **Gemini access**: Ensure your Google account has access to Gemini 2.0 Flash with image generation

## Ready to Tweet! 🚀

Your MCP server is now ready. Claude can now:
- Generate images with Google AI Studio's Gemini 2.0 Flash for specific tweets
- Add existing images from URLs to specific tweets
- Attach images to any tweet in a thread (main tweet or thread tweets)
- Upload them to Twitter
- Post engaging tweets with threads and targeted image placement 