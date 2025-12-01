import sharp from 'sharp';
import { ImageProvider } from '../types.js';
import type {
  TransformInput,
  TransformResult,
  ProviderCapabilities,
  ValidationResult
} from '@photomaton/shared';

export class MockProvider implements ImageProvider {
  name = 'mock';

  async isAvailable(): Promise<boolean> {
    return true; // Mock provider is always available
  }

  async validateConfig(): Promise<ValidationResult> {
    return {
      valid: true,
      errors: []
    };
  }

  getRequiredEnvVars(): string[] {
    return []; // No environment variables required for mock
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxImageSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['jpeg', 'png', 'webp'],
      supportedPresets: ['toon-yellow', 'vampire', 'comic-ink'],
      estimatedProcessingTime: {
        min: 1000, // 1 second
        max: 3000  // 3 seconds
      }
    };
  }

  async transform(input: TransformInput): Promise<TransformResult> {
    const startTime = Date.now();

    // Simulate processing delay
    const delay = parseInt(process.env.MOCK_DELAY_MS || '1000', 10);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Use buffer if provided, otherwise read from file
      const sourceBuffer = input.buffer || await sharp(input.originalPath).toBuffer();

      // Apply different effects based on preset
      let pipeline = sharp(sourceBuffer);

      switch (input.preset) {
        case 'toon-yellow':
          // Cartoonize effect with yellow tint
          pipeline = pipeline
            .modulate({
              saturation: 1.8,
              brightness: 1.1,
              hue: 30 // Add yellow tint
            })
            .median(3) // Smooth details
            .normalize(); // Enhance contrast for cartoon effect
          break;

        case 'vampire':
          // Gothic vampire effect
          pipeline = pipeline
            .modulate({
              saturation: 0.3, // Desaturate for pale look
              brightness: 0.9
            })
            .tint({ r: 220, g: 220, b: 255 }) // Pale blue tint
            .linear(1.2, -10); // Increase contrast
          break;

        case 'comic-ink':
          // Comic book style
          pipeline = pipeline
            .modulate({
              saturation: 2.0
            })
            .median(2)
            .normalize()
            .convolve({
              width: 3,
              height: 3,
              kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1] // Edge enhance
            });
          break;

        default:
          throw new Error(`Unsupported preset: ${input.preset}`);
      }

      // Generate output buffer
      const outputBuffer = await pipeline
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save to file if output path is provided
      if (input.outputPath) {
        await sharp(outputBuffer).toFile(input.outputPath);
      }

      return {
        transformedPath: input.outputPath,
        buffer: outputBuffer,
        provider: this.name,
        duration: Date.now() - startTime,
        meta: {
          effect: input.preset,
          mock: true,
          processingTime: delay
        }
      };
    } catch (error) {
      throw new Error(`Mock transform failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}