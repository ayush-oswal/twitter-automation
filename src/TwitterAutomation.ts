import { TwitterApi } from 'twitter-api-v2';
import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from dist)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: 'SQUARE' | 'LANDSCAPE' | 'PORTRAIT';
  personGeneration?: 'ALLOW_ADULT' | 'ALLOW_MINOR' | 'DISALLOW_ALL';
  threadNumber?: number; // 0 = main tweet, 1 = first thread tweet, 2 = second thread tweet, etc.
}

export interface PostTweetOptions {
  content: string;
  threadContent?: string[];
}

export class TwitterAutomation {
  private twitterClient: TwitterApi;
  private googleAI: GoogleGenAI;
  private imageStoragePath: string;
  private images: Map<number, string[]> = new Map(); // threadNumber -> image paths
  private uploadedMediaIds: Map<number, string[]> = new Map(); // threadNumber -> media IDs

  constructor() {
    // Initialize Twitter API client
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    // Initialize Google AI client
    this.googleAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
    });

    // Set up image storage path
    this.imageStoragePath = process.env.IMAGE_STORAGE_PATH || './images';
    this.ensureImageDirectory();
  }

  private async ensureImageDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.imageStoragePath);
    } catch (error) {
      console.error('Failed to create image directory:', error);
      throw error;
    }
  }

  /**
   * Add an image from URL to a specific thread
   */
  async addImageFromUrl(threadNumber: number, imageUrl: string): Promise<string> {
    try {
      console.error(`Adding image from URL: ${imageUrl} for thread ${threadNumber}`);
      
      // Download and save the image
      const imagePath = await this.downloadAndSaveImage(imageUrl, `url_image_thread_${threadNumber}`);
      
      // Store image for the specified thread number
      if (!this.images.has(threadNumber)) {
        this.images.set(threadNumber, []);
      }
      this.images.get(threadNumber)!.push(imagePath);
      
      console.error(`Image from URL saved to: ${imagePath} for thread ${threadNumber}`);
      return imagePath;
    } catch (error) {
      console.error('Failed to add image from URL:', error);
      throw new Error(`Failed to add image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate an image using Google AI Studio Gemini 2.0 Flash with image generation and store it locally
   */
  async generateImage(options: GenerateImageOptions): Promise<string> {
    try {
      console.error(`Generating image with prompt: "${options.prompt}"`);
      
      // Use the new Google AI API structure
      const response = await this.googleAI.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: options.prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE], // Gemini 2.0 Flash requires both TEXT and IMAGE
        },
      });

      if (!response?.candidates?.[0]?.content?.parts) {
        throw new Error('No response received from Google AI Studio');
      }

      // Find the image part in the response
      let imageData: string | null = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data;
          break;
        }
      }
      
      if (!imageData) {
        throw new Error('No image data returned from Google AI Studio');
      }

      // Save the image locally
      const imagePath = await this.saveImageFromGoogleAI(imageData, options.prompt);
      
      // Store image for the specified thread number (default: 0 for main tweet)
      const threadNumber = options.threadNumber ?? 0;
      if (!this.images.has(threadNumber)) {
        this.images.set(threadNumber, []);
      }
      this.images.get(threadNumber)!.push(imagePath);
      
      console.error(`Image saved to: ${imagePath} for thread ${threadNumber}`);
      return imagePath;
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveImageFromGoogleAI(imageData: string, prompt: string): Promise<string> {
    try {
      // Create filename based on prompt and timestamp
      const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}_${timestamp}.png`;
      const filepath = path.join(this.imageStoragePath, filename);
      
      // Convert base64 string to buffer and save
      const buffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(filepath, buffer);
      
      return filepath;
    } catch (error) {
      console.error('Failed to save image from Google AI:', error);
      throw error;
    }
  }

  private async downloadAndSaveImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Create filename based on prompt and timestamp
      const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}_${timestamp}.png`;
      const filepath = path.join(this.imageStoragePath, filename);
      
      await fs.writeFile(filepath, buffer);
      return filepath;
    } catch (error) {
      console.error('Failed to download and save image:', error);
      throw error;
    }
  }

  /**
   * Upload all generated images to Twitter and store media IDs by thread number
   */
  async uploadImages(): Promise<Map<number, string[]>> {
    try {
      if (this.images.size === 0) {
        console.error('No images to upload');
        return new Map();
      }

      console.error(`Uploading images from ${this.images.size} thread(s) to Twitter...`);
      const allMediaIds = new Map<number, string[]>();

      for (const [threadNumber, imagePaths] of this.images.entries()) {
        const mediaIds: string[] = [];
        
        for (const imagePath of imagePaths) {
          const mediaId = await this.uploadSingleImage(imagePath);
          mediaIds.push(mediaId);
        }
        
        allMediaIds.set(threadNumber, mediaIds);
        console.error(`Thread ${threadNumber}: uploaded ${mediaIds.length} images`);
      }

      this.uploadedMediaIds = allMediaIds;
      console.error(`Successfully uploaded images for all threads`);
      return allMediaIds;
    } catch (error) {
      console.error('Failed to upload images:', error);
      throw error;
    }
  }

  private async uploadSingleImage(imagePath: string): Promise<string> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const mediaUpload = await this.twitterClient.v1.uploadMedia(imageBuffer, { 
        mimeType: 'image/png',
        target: 'tweet'
      });
      
      console.error(`Uploaded image: ${imagePath} -> Media ID: ${mediaUpload}`);
      return mediaUpload;
    } catch (error) {
      console.error(`Failed to upload image ${imagePath}:`, error);
      throw error;
    }
  }

  /**
   * Post a tweet with optional images and thread support
   */
  async postTweet(options: PostTweetOptions): Promise<any> {
    try {
      console.error('Posting tweet...');
      
      // Prepare main tweet options
      const mainTweetOptions: any = {
        text: options.content,
      };

      // Add media for main tweet (thread 0) if available
      const mainTweetMediaIds = this.uploadedMediaIds.get(0) || [];
      if (mainTweetMediaIds.length > 0) {
        mainTweetOptions.media = { media_ids: mainTweetMediaIds };
        console.error(`Attaching ${mainTweetMediaIds.length} images to main tweet`);
      }

      // Post the main tweet
      const mainTweet = await this.twitterClient.v2.tweet(mainTweetOptions);
      console.error(`Main tweet posted with ID: ${mainTweet.data.id}`);

      // Handle thread if threadContent is provided
      let threadTweets = [mainTweet];
      if (options.threadContent && options.threadContent.length > 0) {
        console.error(`Creating thread with ${options.threadContent.length} additional tweets...`);
        
        let previousTweetId = mainTweet.data.id;
        for (let i = 0; i < options.threadContent.length; i++) {
          const threadText = options.threadContent[i];
          const threadNumber = i + 1; // Thread numbers start from 1 for first thread tweet
          
          // Prepare thread tweet options
          const threadTweetOptions: any = {
            text: threadText,
            reply: { in_reply_to_tweet_id: previousTweetId }
          };
          
          // Add media for this specific thread position if available
          const threadMediaIds = this.uploadedMediaIds.get(threadNumber) || [];
          if (threadMediaIds.length > 0) {
            threadTweetOptions.media = { media_ids: threadMediaIds };
            console.error(`Attaching ${threadMediaIds.length} images to thread tweet ${threadNumber}`);
          }
          
          const threadTweet = await this.twitterClient.v2.tweet(threadTweetOptions);
          threadTweets.push(threadTweet);
          previousTweetId = threadTweet.data.id;
          console.error(`Thread tweet ${threadNumber} posted with ID: ${threadTweet.data.id}`);
        }
      }

      // Clear the uploaded media IDs for next use
      this.clearImages();
      
      console.error('Tweet posting completed successfully!');
      return {
        mainTweet: mainTweet.data,
        threadTweets: threadTweets.map(t => t.data),
        totalTweets: threadTweets.length
      };
    } catch (error) {
      console.error('Failed to post tweet:', error);
      throw error;
    }
  }

  /**
   * Clear all generated images and reset state
   */
  clearImages(): void {
    this.images = new Map();
    this.uploadedMediaIds = new Map();
    console.error('Cleared all images and media IDs');
  }

  /**
   * Get current state information
   */
  getState(): any {
    // Convert Maps to objects for easier JSON serialization
    const imagesObj: { [key: number]: string[] } = {};
    const uploadedMediaIdsObj: { [key: number]: string[] } = {};
    
    for (const [threadNumber, imagePaths] of this.images.entries()) {
      imagesObj[threadNumber] = imagePaths;
    }
    
    for (const [threadNumber, mediaIds] of this.uploadedMediaIds.entries()) {
      uploadedMediaIdsObj[threadNumber] = mediaIds;
    }
    
    return {
      images: imagesObj,
      uploadedMediaIds: uploadedMediaIdsObj,
      imageStoragePath: this.imageStoragePath,
      totalImages: Array.from(this.images.values()).reduce((total, imagePaths) => total + imagePaths.length, 0),
      threadsWithImages: Array.from(this.images.keys()).sort()
    };
  }
} 