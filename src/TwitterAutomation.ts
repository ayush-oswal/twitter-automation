import { TwitterApi } from 'twitter-api-v2';
import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { SendTweetV2Params } from 'twitter-api-v2';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: 'SQUARE' | 'LANDSCAPE' | 'PORTRAIT';
  personGeneration?: 'ALLOW_ADULT' | 'ALLOW_MINOR' | 'DISALLOW_ALL';
  threadNumber?: number;
}

export interface PostTweetOptions {
  content: string;
  threadContent?: string[];
}

export class TwitterAutomation {
  private twitterClient: TwitterApi;
  private googleAI: GoogleGenAI;
  private imageStoragePath: string;
  private images: Map<number, string[]> = new Map();
  private uploadedMediaIds: Map<number, string[]> = new Map();

  constructor() {
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    this.googleAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
    });
    this.imageStoragePath = process.env.IMAGE_STORAGE_PATH || path.join(__dirname, '..', 'images');
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
      
      const imagePath = await this.downloadAndSaveImage(imageUrl, `url_image_thread_${threadNumber}`);
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

      const imagePath = await this.saveImageFromGoogleAI(imageData, options.prompt);
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
      const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}_${timestamp}.png`;
      const filepath = path.join(this.imageStoragePath, filename);
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
          try {
            const mediaId = await this.uploadSingleImage(imagePath);
            mediaIds.push(mediaId);
          } catch (err) {
            console.error(`Skipping image ${imagePath} due to error:`, err);
            continue;
          }
        }
        
        if (mediaIds.length > 0) {
          allMediaIds.set(threadNumber, mediaIds);
          console.error(`Thread ${threadNumber}: uploaded ${mediaIds.length} images`);
        } else {
          console.error(`Thread ${threadNumber}: no valid images to upload`);
        }
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
      try {
        await fs.access(imagePath);
      } catch {
        throw new Error(`Image file not found at path: ${imagePath}`);
      }

      const imageBuffer = await fs.readFile(imagePath);
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error(`Empty or invalid image buffer for file: ${imagePath}`);
      }

      const mediaUpload = await this.twitterClient.readWrite.v2.uploadMedia(imageBuffer, {
        media_type: 'image/png',
        media_category: 'tweet_image'
      });
      
      console.error(`Uploaded image: ${imagePath} -> Media ID: ${mediaUpload}`);
      return mediaUpload;
    } catch (error) {
      console.error(`Failed to upload image ${imagePath}:`, error);
      throw error;
    }
  }

  /**
   * Post a tweet with optional images and thread support using individual tweet calls for Essential API access
   */
  /**
   * Validate tweet content length (max 275 characters to be safe)
   */
  private validateTweetLength(content: string, context: string = 'Tweet'): void {
    const maxLength = 275;
    if (content.length > maxLength) {
      throw new Error(`${context} content is ${content.length} characters, which exceeds the ${maxLength} character limit. Please shorten the content.`);
    }
  }

  /**
   * Post a tweet with optional images and thread support using tweetThread for efficiency
   * Automatically uploads images before posting
   */
  async postTweet(options: PostTweetOptions): Promise<any> {
    try {
      console.error('Posting tweet...');
      
      this.validateTweetLength(options.content, 'Main tweet');
      
      if (options.threadContent && options.threadContent.length > 0) {
        for (let i = 0; i < options.threadContent.length; i++) {
          this.validateTweetLength(options.threadContent[i], `Thread tweet ${i + 1}`);
        }
      }
      
      if (this.images.size > 0) {
        console.error('Uploading images before posting...');
        await this.uploadImages();
      }
      
      const tweets: SendTweetV2Params[] = [];
      const mainTweetOptions: SendTweetV2Params = {
        text: options.content,
      };

      const mainTweetMediaIds = this.uploadedMediaIds.get(0) || [];
      if (mainTweetMediaIds.length > 0) {
        mainTweetOptions.media = { media_ids: mainTweetMediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string] };
        console.error(`Attaching ${mainTweetMediaIds.length} images to main tweet`);
      }
      
      tweets.push(mainTweetOptions);
      if (options.threadContent && options.threadContent.length > 0) {
        console.error(`Preparing thread with ${options.threadContent.length} additional tweets...`);
        
                  for (let i = 0; i < options.threadContent.length; i++) {
            const threadText = options.threadContent[i];
            const threadNumber = i + 1;
            
            const threadTweetOptions: SendTweetV2Params = {
              text: threadText,
            };
          const threadMediaIds = this.uploadedMediaIds.get(threadNumber) || [];
          if (threadMediaIds.length > 0) {
            threadTweetOptions.media = { media_ids: threadMediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string] };
            console.error(`Attaching ${threadMediaIds.length} images to thread tweet ${threadNumber}`);
          }
          
          tweets.push(threadTweetOptions);
        }
              }

      console.error(`Posting thread with ${tweets.length} tweets...`);
      const threadResults = await this.twitterClient.v2.tweetThread(tweets);
      
      console.error(`Thread posted successfully with ${threadResults.length} tweets`);
      for (let i = 0; i < threadResults.length; i++) {
        const tweetType = i === 0 ? 'Main tweet' : `Thread tweet ${i}`;
        console.error(`${tweetType} posted with ID: ${threadResults[i].data.id}`);
      }

      this.clearImages();
      
      console.error('Tweet posting completed successfully!');
      return {
        mainTweet: threadResults[0].data,
        threadTweets: threadResults.map(t => t.data),
        totalTweets: threadResults.length
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
    try {
      const files = fs.readdirSync(this.imageStoragePath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.imageStoragePath, file));
      }
      console.error('Cleared all images from storage and reset media IDs');
    } catch (error) {
      console.error('Error clearing image files:', error);
    }
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