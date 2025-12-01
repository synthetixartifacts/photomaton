# Gemini Imagen Implementation Guide

> **Primary AI Provider:** Google Gemini Imagen
> **Documentation:** https://ai.google.dev/gemini-api/docs/imagen#javascript

## Overview

This project uses Google's Gemini Imagen API as the primary image transformation provider. Gemini Imagen provides state-of-the-art image generation and editing capabilities.

## Implementation Location

```
app/server/src/providers/gemini-imagen/
├── index.ts              # Main provider implementation
├── gemini-imagen.test.ts # Unit tests
├── prompts.ts           # Preset to prompt mapping
└── config.ts            # Configuration validation
```

## Environment Variables

Add to `.env`:
```bash
# Gemini Imagen Configuration
IMAGE_PROVIDER=gemini-imagen
GEMINI_API_KEY=your_api_key_here
```

Add to `.env.example`:
```bash
# Gemini Imagen Configuration (PRIMARY PROVIDER)
# Get your API key from: https://ai.google.dev/
IMAGE_PROVIDER=gemini-imagen
GEMINI_API_KEY=

# Alternative providers (if needed)
# OPENAI_API_KEY=
# REPLICATE_API_TOKEN=
```

## Implementation Code

### Provider Implementation
```typescript
// app/server/src/providers/gemini-imagen/index.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageProvider, TransformInput, TransformResult } from '../types';
import { buildPromptForPreset } from './prompts';
import fs from 'fs/promises';

export class GeminiImagenProvider implements ImageProvider {
  name = 'gemini-imagen';
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test API key validity
      const model = this.client.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
      return true;
    } catch (error) {
      return false;
    }
  }

  getRequiredEnvVars(): string[] {
    return ['GEMINI_API_KEY'];
  }

  async transform(input: TransformInput): Promise<TransformResult> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
      const prompt = buildPromptForPreset(input.preset);

      // Read source image
      const imageBuffer = await fs.readFile(input.originalPath);

      // Generate transformed image using Gemini Imagen
      const response = await model.generateImage({
        prompt,
        image: imageBuffer,
        ...input.options
      });

      // Save result
      await fs.writeFile(input.transformedPath, response.data);

      return {
        transformedPath: input.transformedPath,
        provider: this.name,
        duration: Date.now() - startTime,
        meta: {
          model: 'imagen-3.0-generate-001',
          service: 'google-gemini',
          prompt,
          cost: this.estimateCost()
        }
      };
    } catch (error) {
      throw new Error(`Gemini Imagen transformation failed: ${error.message}`);
    }
  }

  private estimateCost(): number {
    // Gemini Imagen pricing estimation
    return 0.08; // Approximate cost per image
  }
}
```

### Prompt Mapping
```typescript
// app/server/src/providers/gemini-imagen/prompts.ts
import { PresetType } from '../../../shared/types';

export function buildPromptForPreset(preset: PresetType): string {
  const prompts: Record<PresetType, string> = {
    'toon-yellow': 'Transform into a cartoon style with flat colors, bold outlines, and simple shapes. Yellow skin tone, 2D animation style.',
    'vampire': 'Transform into a gothic vampire portrait with pale skin, dramatic lighting, and tasteful fangs. No gore or blood.',
    'comic-ink': 'Transform into comic book art style with high contrast ink lines, halftone patterns, and bold graphic style.'
  };

  return prompts[preset] || prompts['toon-yellow'];
}
```

## Integration Steps

1. **Install Dependencies**
   ```bash
   npm install @google/generative-ai
   ```

2. **Register Provider**
   ```typescript
   // app/server/src/providers/index.ts
   import { GeminiImagenProvider } from './gemini-imagen';

   export const providers = {
     'mock': MockProvider,
     'gemini-imagen': GeminiImagenProvider
   };
   ```

3. **Environment Setup**
   - Get API key from https://ai.google.dev/
   - Add to `.env` file
   - Set `IMAGE_PROVIDER=gemini-imagen`

4. **Testing**
   ```bash
   # Test provider
   docker exec photomaton-app-1 npm test -- gemini-imagen

   # Integration test
   curl -k -X POST https://localhost:8443/api/transform \
     -H "Content-Type: application/json" \
     -d '{"photoId": "test-id", "preset": "toon-yellow"}'
   ```

## API Reference

Full documentation: https://ai.google.dev/gemini-api/docs/imagen#javascript

Key endpoints and features:
- Image generation from text prompts
- Image-to-image transformation
- Style transfer capabilities
- High-quality output at various resolutions

## Error Handling

Common errors and solutions:
- **Authentication errors**: Check GEMINI_API_KEY
- **Rate limiting**: Implement retry with exponential backoff
- **Image format issues**: Ensure proper JPEG/PNG input
- **Prompt length**: Keep prompts under character limits

## Cost Optimization

- Cache transformed images to avoid re-processing
- Use appropriate resolution settings
- Monitor API usage through Google Cloud Console
- Implement request queuing for high-volume scenarios

## Fallback Strategy

If Gemini Imagen is unavailable:
1. Automatically fallback to mock provider
2. Log error and notify user
3. Maintain application functionality
4. Retry mechanism for temporary outages