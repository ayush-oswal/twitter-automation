FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Create images directory
RUN mkdir -p /app/images

CMD ["node", "dist/index.js"] 