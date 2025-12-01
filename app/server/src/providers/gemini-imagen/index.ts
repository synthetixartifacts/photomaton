import { GoogleGenAI } from "@google/genai";
import { promises as fs } from 'fs';
import pino from 'pino';
import { ImageProvider, ProviderError } from '../types.js';
import { createAPILogger } from '../../utils/apiLogger.js';
import { logTransformStep } from '../../utils/transformLogger.js';
import { presetService } from '../../services/preset.js';
import type {
  TransformInput,
  TransformResult,
  ProviderCapabilities,
  ValidationResult
} from '@photomaton/shared';

const logger = pino({ name: 'gemini-provider' });

// Removed hardcoded fallback prompts - using database only

export class GeminiImageProvider implements ImageProvider {
  name = 'gemini-imagen';
  private client: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey;

    logTransformStep(
      'GEMINI_AVAILABILITY_CHECK',
      {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        available
      },
      `Gemini provider availability check: ${available ? 'AVAILABLE' : 'NOT AVAILABLE'} (API key ${this.apiKey ? 'SET' : 'NOT SET'})`
    );

    return available;
  }

  async validateConfig(): Promise<ValidationResult> {
    if (!this.apiKey) {
      return {
        valid: false,
        errors: ['GEMINI_API_KEY environment variable is not set']
      };
    }

    try {
      // Initialize client if not already done
      if (!this.client) {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      }

      // Check that client is initialized properly
      if (!this.client) {
        throw new Error('Unable to initialize Gemini client');
      }

      return { valid: true };
    } catch (error) {
      logger.error({ error }, 'Failed to validate Gemini configuration');
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown configuration error']
      };
    }
  }

  getRequiredEnvVars(): string[] {
    return ['GEMINI_API_KEY'];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxImageSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      supportedPresets: ['toon-yellow', 'vampire', 'comic-ink'],
      estimatedProcessingTime: { min: 3000, max: 15000 } // 3-15 seconds
    };
  }

  private async imageToBase64(pathOrBuffer: string | Buffer): Promise<string> {
    try {
      if (Buffer.isBuffer(pathOrBuffer)) {
        return pathOrBuffer.toString('base64');
      }
      const buffer = await fs.readFile(pathOrBuffer);
      return buffer.toString('base64');
    } catch (error) {
      throw new ProviderError(
        `Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_READ_ERROR'
      );
    }
  }

  private async generateWithRetry(
    client: GoogleGenAI,
    model: string,
    contents: any[],
    retryCount = 0,
    apiLogger?: any
  ): Promise<any> {
    try {
      // Update the API call request with retry info (preserve existing data)
      if (apiLogger && apiLogger.log) {
        const existingRequest = apiLogger.log.request || {};
        const existingBody = existingRequest.body || {};
        
        apiLogger.log.request = {
          ...existingRequest,
          body: {
            ...existingBody,
            model,
            contentsLength: contents.length,
            hasImage: contents.some(c => c.inlineData),
            hasText: contents.some(c => c.text),
            retryAttempt: retryCount
          }
        };
      }

      const response = await client.models.generateContent({
        model,
        contents
      });

      // Log successful response
      if (apiLogger) {
        apiLogger.setResponse({
          status: 200,
          statusText: 'OK',
          body: {
            hasResponse: !!response,
            hasCandidates: !!(response?.candidates),
            candidatesCount: response?.candidates?.length || 0
          }
        });
      }

      return response;
    } catch (error) {
      const isRetryable = this.isRetryableError(error);

      // Log error
      if (apiLogger && retryCount >= this.maxRetries) {
        apiLogger.setError(error);
      }

      if (isRetryable && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.warn({
          error,
          retryCount,
          delay,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }, 'Retrying Gemini API request');

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateWithRetry(client, model, contents, retryCount + 1, apiLogger);
      }

      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on rate limits, temporary failures, and network errors
    const retryableMessages = [
      'rate limit',
      'quota exceeded',
      'temporary',
      'timeout',
      'network',
      'internal error',  // Google Gemini API 500 errors
      '429',
      '500',  // Internal server errors (transient)
      '503',
      '504'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  async transform(input: TransformInput): Promise<TransformResult> {
    const startTime = Date.now();
    const apiLogger = createAPILogger('gemini-imagen', 'transform', 'generateContent');

    try {
      logger.info({
        photoId: input.photoId,
        preset: input.preset,
        hasBuffer: !!input.buffer,
        hasOriginalPath: !!input.originalPath,
        outputPath: input.outputPath
      }, 'Starting Gemini transformation');
      // Validate configuration
      const validation = await this.validateConfig();
      if (!validation.valid) {
        throw new ProviderError(
          `Provider configuration invalid: ${validation.errors?.join(', ')}`,
          'CONFIG_INVALID'
        );
      }

      if (!this.client) {
        throw new ProviderError('Gemini client not initialized', 'CLIENT_ERROR');
      }

      // Get the prompt from database only - no fallbacks
      const dbPreset = await presetService.getByPresetId(input.preset);
      
      if (!dbPreset) {
        throw new ProviderError(
          `Preset not found in database: ${input.preset}`,
          'PRESET_NOT_FOUND'
        );
      }

      if (!dbPreset.enabled) {
        throw new ProviderError(
          `Preset is disabled: ${input.preset}`,
          'PRESET_DISABLED'
        );
      }

      if (!dbPreset.prompt) {
        throw new ProviderError(
          `Preset has no prompt configured: ${input.preset}`,
          'PRESET_NO_PROMPT'
        );
      }

      const stylePrompt = dbPreset.prompt;
      
      logger.info({
        photoId: input.photoId,
        preset: input.preset,
        presetName: dbPreset.name,
        promptLength: stylePrompt.length
      }, 'Using prompt from database');

      // Convert image to base64
      const base64Image = await this.imageToBase64(
        input.buffer || input.originalPath!
      );

      logger.debug({
        photoId: input.photoId,
        imageSize: base64Image.length,
        promptLength: stylePrompt.length
      }, 'Image and prompt prepared');

      // Prepare the contents with image and transformation instructions
      const contents = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        },
        {
          text: stylePrompt
        }
      ];

      // Log the API call details with full prompt
      apiLogger.setRequest({
        photoId: input.photoId,
        preset: input.preset,
        body: {
          model: 'gemini-2.5-flash-image-preview',
          presetName: dbPreset.name,
          imageSize: base64Image.length,
          promptLength: stylePrompt.length,
          prompt: stylePrompt,
          promptPreview: stylePrompt.substring(0, 100) + (stylePrompt.length > 100 ? '...' : '')
        }
      });

      // Generate the transformed image with retry logic
      logger.info({
        photoId: input.photoId,
        model: 'gemini-2.5-flash-image-preview'
      }, 'Calling Gemini API');

      const response = await this.generateWithRetry(
        this.client,
        'gemini-2.5-flash-image-preview',
        contents,
        0,
        apiLogger
      );

      // Log response structure for debugging
      logger.debug({
        photoId: input.photoId,
        responseStructure: {
          hasResponse: !!response,
          hasTopLevelCandidates: !!(response?.candidates),
          candidatesLength: response?.candidates?.length || 0
        }
      }, 'Gemini API response structure');

      // Extract the generated image from the response
      const candidate = response?.candidates?.[0];
      if (!candidate) {
        const errorMsg = 'No image generated in response - API returned empty candidates';
        apiLogger.setError(new Error(errorMsg));
        await apiLogger.writeToFile();
        throw new ProviderError(
          errorMsg,
          'GENERATION_FAILED',
          true
        );
      }

      // Find the image part in the response
      let outputBuffer: Buffer | null = null;
      const parts = candidate.content?.parts || candidate.parts || [];

      logger.debug({
        photoId: input.photoId,
        partsCount: parts.length,
        partsTypes: parts.map((p: any) => ({
          hasInlineData: !!p.inlineData,
          hasText: !!p.text,
          mimeType: p.inlineData?.mimeType
        }))
      }, 'Analyzing response parts');

      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          outputBuffer = Buffer.from(part.inlineData.data, 'base64');
          logger.info({
            photoId: input.photoId,
            imageSize: outputBuffer.length,
            mimeType: part.inlineData.mimeType
          }, 'Found transformed image in response');
          break;
        }
      }

      if (!outputBuffer) {
        const errorMsg = 'No image found in API response parts';
        apiLogger.setError(new Error(errorMsg));
        await apiLogger.writeToFile();
        throw new ProviderError(
          errorMsg,
          'NO_IMAGE_GENERATED',
          true
        );
      }

      // Save to file if output path is provided
      if (input.outputPath) {
        await fs.writeFile(input.outputPath, outputBuffer);
        logger.info({
          photoId: input.photoId,
          outputPath: input.outputPath,
          size: outputBuffer.length
        }, 'Saved transformed image');
      }

      const duration = Date.now() - startTime;

      // Log success
      apiLogger.setResponse({
        status: 200,
        statusText: 'Success',
        body: {
          transformedImageSize: outputBuffer.length,
          duration,
          model: 'gemini-2.5-flash-image-preview'
        }
      });
      await apiLogger.writeToFile();

      logger.info({
        photoId: input.photoId,
        preset: input.preset,
        duration,
        outputPath: input.outputPath,
        bufferSize: outputBuffer.length
      }, 'Gemini transformation completed successfully');

      return {
        transformedPath: input.outputPath,
        buffer: outputBuffer,
        provider: this.name,
        duration,
        meta: {
          model: 'gemini-2.5-flash-image-preview',
          service: 'google-genai',
          preset: input.preset,
          hasWatermark: true // SynthID watermark is automatically added
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error with full context
      logger.error({
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error,
        photoId: input.photoId,
        preset: input.preset,
        duration
      }, 'Gemini transformation failed');

      // Ensure API error is logged
      apiLogger.setError(error);
      await apiLogger.writeToFile();

      // Wrap in ProviderError if not already
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Gemini transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSFORM_FAILED',
        this.isRetryableError(error)
      );
    }
  }
}

// Export factory function
export function createProvider(): ImageProvider {
  return new GeminiImageProvider();
}