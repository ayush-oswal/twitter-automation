# Twitter Automation MCP Server

A Model Context Protocol (MCP) server that enables Claude to automate Twitter posting with AI-generated images. This server provides three core functions: generating images, uploading them to Twitter, and posting tweets with proper threading support.

## Features

🎨 **AI Image Generation**: Generate images using Google AI Studio's Gemini 2.0 Flash  
🔗 **URL Image Support**: Add existing images from URLs directly  
🐦 **Twitter Integration**: Full Twitter API v2 support with media upload  
🧵 **Thread Support**: Automatic thread creation for longer content  
📱 **Smart Formatting**: Handle emojis, formatting, and engaging content  
🔄 **Stateful Operations**: Images persist through the workflow  

## Workflow

1. **Content Creation**: Work with Claude to craft the perfect tweet and thread
2. **Image Handling** (Optional): Add images using either:
   - `generateImages`: AI-generate images for specific tweets
   - `addImageFromUrl`: Add existing images from URLs
   - Use `threadNumber: 0` for main tweet images
   - Use `threadNumber: 1, 2, 3...` for thread tweet images
3. **Media Upload**: Use `uploadImages` to prepare all images for Twitter
4. **Tweet Posting**: Use `postTweet` to publish with images attached to correct tweets

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Copy the example environment file and fill in your API keys:

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Twitter API Credentials (from developer.twitter.com)
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret_here

# Google AI Studio API Key (from aistudio.google.com)
GOOGLE_AI_API_KEY=your_google_ai_studio_api_key_here

# Optional: Custom image storage path
IMAGE_STORAGE_PATH=./images
```

### 3. Build the Project

```bash
npm run build
```

### 4. Configure Claude Desktop

Add this to your Claude Desktop MCP configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**Note:** 
- Use **double backslashes** (`\\`) for Windows paths
- Replace `YourName` with your actual Windows username
- Environment variables are loaded from your `.env` file automatically

```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "node",
      "args": ["C:/Users/YourName/Desktop/coding/twitter-automation/dist/index.js"],
      "env": {
        "TWITTER_API_KEY": "your_actual_api_key",
        "TWITTER_API_SECRET": "your_actual_api_secret",
        "TWITTER_ACCESS_TOKEN": "your_actual_access_token",
        "TWITTER_ACCESS_TOKEN_SECRET": "your_actual_access_token_secret",
        "GOOGLE_AI_API_KEY": "your_actual_google_ai_key"
      }
    }
  }
}
```

## Getting API Keys

### Twitter API Keys

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a new app or use an existing one
3. Generate API Key, API Secret, Access Token, and Access Token Secret
4. Ensure your app has Read and Write permissions

### Google AI Studio API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Navigate to "Get API Key" section
4. Create a new API key for your project
5. Ensure you have access to Gemini 2.0 Flash with image generation capabilities

## Available Functions

### `generateImages`

Generate an AI image based on a text prompt.

**Parameters:**
- `prompt` (required): Description of the image to generate
- `aspectRatio` (optional): Image aspect ratio - "SQUARE", "LANDSCAPE", or "PORTRAIT"
- `personGeneration` (optional): Person generation policy - "ALLOW_ADULT", "ALLOW_MINOR", or "DISALLOW_ALL"
- `threadNumber` (optional): Which tweet to attach image to - 0 = main tweet, 1 = first thread tweet, etc. (default: 0)

**Examples:**
```
Generate image for main tweet: "A futuristic cityscape at sunset with flying cars"
Generate image for second thread tweet: "A close-up of flying cars" with threadNumber: 2
```

### `addImageFromUrl`

Add an existing image from a URL to a specific thread position.

**Parameters:**
- `imageUrl` (required): The URL of the image to download and add
- `threadNumber` (optional): Which tweet to attach image to - 0 = main tweet, 1 = first thread tweet, etc. (default: 0)

**Examples:**
```
Add image to main tweet: "https://example.com/hero-image.jpg"
Add image to third thread tweet: "https://example.com/chart.png" with threadNumber: 3
```

### `uploadImages`

Upload all generated/added images to Twitter for use in tweets.

**Parameters:** None

**Note:** Must be called after `generateImages`/`addImageFromUrl` and before `postTweet` if you want to include images.

### `postTweet`

Post a tweet with optional images and thread support.

**Parameters:**
- `content` (required): Main tweet text with formatting and emojis
- `threadContent` (optional): Array of additional tweets for threading

**Example:**
```
Post this tweet: "🚀 Just launched my new AI project! Here's what it can do... ✨"
With thread: ["🔧 Built with cutting-edge technology", "📈 Already seeing amazing results!"]
```

## Usage Examples

### Simple Tweet
```
Hey Claude, post this tweet: "Hello world! 👋 #FirstTweet"
```

### Tweet with Generated Image
```
Generate an image of a robot coding at a computer, then post this tweet: "AI is the future of development! 🤖💻 #AI #Coding"
```

### Tweet with URL Image
```
Add an image from URL "https://example.com/chart.png", then post this tweet: "Check out our latest performance metrics! 📊 #Data"
```

### Thread with Mixed Image Sources
```
Combine generated and URL images for different parts of a thread:
1. Generate chart image for main tweet: "Generate a data visualization chart" (threadNumber: 0)
2. Add URL image for first thread: "https://example.com/engagement.png" (threadNumber: 1)  
3. Generate mobile usage pie chart: "Generate mobile vs desktop usage pie chart" (threadNumber: 2)

Then post thread:
Main tweet: "📊 Here's what our latest data analysis revealed..." (gets generated chart)
Thread: [
  "Key insight #1: User engagement is up 150% 📈" (gets URL image),
  "Key insight #2: Mobile usage dominates at 80% 📱" (gets generated pie chart),
  "What this means for the future 👇" (no image)
]
```

## File Structure

```
twitter-automation/
├── src/
│   ├── TwitterAutomation.ts    # Core automation class
│   ├── server.ts               # MCP server implementation
│   └── index.ts                # Entry point
├── images/                     # Generated images storage
├── dist/                       # Compiled JavaScript
├── package.json
├── tsconfig.json
├── SETUP.md
└── README.md
```

## Development

### Watch Mode
```bash
npm run dev
```

### Testing
```bash
# Test the server directly
npm start
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Run `npm install` and `npm run build`
2. **API authentication errors**: Verify your API keys in `.env`
3. **Twitter permission errors**: Ensure your Twitter app has Read and Write permissions
4. **Image generation fails**: Check your Google AI Studio API key and Gemini model access
5. **MCP not connecting**: Verify the path in Claude Desktop config matches your build location

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=1 npm start
```

## Security Notes

- Never commit your `.env` file or API keys to version control
- Use environment variables in production
- Regularly rotate your API keys
- Monitor usage to avoid unexpected charges

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy Tweeting! 🐦✨** 