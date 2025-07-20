# Deployment Guide

## Option 1: NPM Package (Recommended)

### Pros
- ✅ Easy to install with `npx`
- ✅ Automatic updates
- ✅ No server maintenance
- ✅ Works offline

### For Users (Installing Published Package)
```bash
# Install the package globally
npm install -g twitter-automation-mcp
```

### For Developers (Publishing Your Own)
```bash
# 1. Build and publish
npm run build
npm login
npm publish

# 2. Verify publication
npm view twitter-automation-mcp
```

### Claude Desktop Config
```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "npx",
      "args": ["twitter-automation-mcp"],
      "env": {
        "TWITTER_API_KEY": "your_api_key",
        "TWITTER_API_SECRET": "your_api_secret",
        "TWITTER_ACCESS_TOKEN": "your_access_token",
        "TWITTER_ACCESS_TOKEN_SECRET": "your_access_token_secret",
        "GOOGLE_AI_API_KEY": "your_google_ai_key"
      }
    }
  }
}
```

## Option 2: Local Development

### Pros
- ✅ Full control over the code
- ✅ Can modify and test changes
- ✅ Latest unreleased features

### Setup Steps
```bash
# 1. Clone and install
git clone https://github.com/ayush-oswal/twitter-automation.git
cd twitter-automation
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your API keys

# 3. Build the project
npm run build
```

### Claude Desktop Config
```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "node",
      "args": ["C:\\path\\to\\twitter-automation\\dist\\index.js"],
      "env": {
        "TWITTER_API_KEY": "your_api_key",
        "TWITTER_API_SECRET": "your_api_secret",
        "TWITTER_ACCESS_TOKEN": "your_access_token",
        "TWITTER_ACCESS_TOKEN_SECRET": "your_access_token_secret",
        "GOOGLE_AI_API_KEY": "your_google_ai_key"
      }
    }
  }
}
```

## Option 3: Local Docker Deployment

### Pros
- ✅ Isolated environment
- ✅ Consistent runtime across systems
- ✅ Easy to stop/start/restart

### Prerequisites
- Docker installed on your system
- Docker Compose (included with Docker Desktop)

### Deploy Steps

1. **Build the Docker image:**
```bash
npm run build
docker build -t twitter-automation-mcp .
```

2. **Create your `.env` file:**
```bash
cp env.example .env
# Edit .env with your API keys
```

3. **Test the image works:**
```bash
# Test run (should start and wait for input)
docker run --rm -i --env-file .env -v "$(pwd)/images:/app/images" twitter-automation-mcp
# Press Ctrl+C to exit
```

### Claude Desktop Config for Docker

**Important**: MCP servers don't run as persistent services. Claude Desktop launches them on-demand.

#### Method A: Direct Docker Run (Recommended)
```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i", 
        "--env-file", 
        ".env",
        "-v", 
        "./images:/app/images",
        "twitter-automation-mcp"
      ],
      "cwd": "C:\\Users\\Ayush\\Desktop\\coding\\twitter-automation"
    }
  }
}
```

#### Method B: Using Pre-built Image
```json
{
  "mcpServers": {
    "twitter-automation": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i", 
        "-e", "TWITTER_API_KEY=your_api_key",
        "-e", "TWITTER_API_SECRET=your_api_secret", 
        "-e", "TWITTER_ACCESS_TOKEN=your_access_token",
        "-e", "TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret",
        "-e", "GOOGLE_AI_API_KEY=your_google_ai_key",
        "-v", 
        "C:\\Users\\Ayush\\Desktop\\coding\\twitter-automation\\images:/app/images",
        "twitter-automation-mcp"
      ]
    }
  }
}
```

### Docker Environment Variables

The Docker container expects these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `TWITTER_API_KEY` | ✅ | Your Twitter API Key |
| `TWITTER_API_SECRET` | ✅ | Your Twitter API Secret |
| `TWITTER_ACCESS_TOKEN` | ✅ | Your Twitter Access Token |
| `TWITTER_ACCESS_TOKEN_SECRET` | ✅ | Your Twitter Access Token Secret |
| `GOOGLE_AI_API_KEY` | ✅ | Your Google AI Studio API Key |
| `IMAGE_STORAGE_PATH` | ❌ | Path for storing images (default: `/app/images`) |

### Troubleshooting Docker

**Docker image won't build:**
```bash
# Make sure you've built the TypeScript first
npm run build

# Check if dist/ folder exists and has files
ls dist/
```

**Environment variables not working:**
```bash
# Test your .env file is correct
docker run --rm --env-file .env twitter-automation-mcp env | grep TWITTER
```

**Permission issues with images folder:**
```bash
# Windows: Ensure Docker Desktop has access to your drive
# Go to Docker Desktop → Settings → Resources → File Sharing

# Linux/Mac: Fix permissions
sudo chown -R $USER:$USER ./images
```

**Claude Desktop can't connect:**
- Make sure your `.env` file exists in the project directory
- Verify the `cwd` path in Claude config matches your project location
- Check Docker is running: `docker version`

## Which Option Should You Choose?

**Choose NPM Package if:**
- You just want to use the MCP server (most users)
- You want the simplest setup
- You want automatic updates

**Choose Local Development if:**
- You want to modify the code
- You're contributing to the project
- You need the latest unreleased features

**Choose Docker if:**
- You want isolated environment
- You have multiple Node.js projects with different versions
- You're planning to deploy to production later

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables in Claude config for sensitive data
- Regularly rotate your API keys
- Keep your Docker images updated 