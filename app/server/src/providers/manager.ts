import { ImageProvider, ProviderError } from './types.js';
import { MockProvider } from './mock/index.js';
import { createProvider as createGeminiProvider } from './gemini-imagen/index.js';
import { logTransformStep } from '../utils/transformLogger.js';

export class ProviderManager {
  private providers: Map<string, ImageProvider> = new Map();
  private currentProvider: string;

  constructor() {
    // Register available providers
    this.registerProvider(new MockProvider());

    // Register AI provider (will check API keys on use)
    this.registerProvider(createGeminiProvider());

    // Set current provider from environment or default to gemini-imagen
    this.currentProvider = process.env.IMAGE_PROVIDER || 'gemini-imagen';
  }

  registerProvider(provider: ImageProvider): void {
    this.providers.set(provider.name, provider);
  }

  async getProvider(name?: string): Promise<ImageProvider> {
    const providerName = name || this.currentProvider;
    const availableProviders = Array.from(this.providers.keys());

    logTransformStep(
      'MANAGER_GET_PROVIDER',
      {
        requestedProvider: name,
        defaultProvider: this.currentProvider,
        selectedProvider: providerName,
        availableProviders
      },
      `Provider manager: requested='${name}', default='${this.currentProvider}', selected='${providerName}'`
    );

    const provider = this.providers.get(providerName);

    if (!provider) {
      logTransformStep(
        'MANAGER_PROVIDER_NOT_FOUND',
        {
          requestedProvider: providerName,
          availableProviders
        },
        `Provider '${providerName}' not found. Available: ${availableProviders.join(', ')}`,
        'error'
      );
      throw new ProviderError(
        `Provider '${providerName}' not found. Available: ${availableProviders.join(', ')}`,
        'PROVIDER_NOT_FOUND'
      );
    }

    logTransformStep(
      'MANAGER_CHECK_AVAILABILITY',
      {
        provider: providerName
      },
      `Checking availability of provider: ${providerName}`
    );

    const isAvailable = await provider.isAvailable();

    logTransformStep(
      'MANAGER_AVAILABILITY_RESULT',
      {
        provider: providerName,
        isAvailable
      },
      `Provider '${providerName}' availability: ${isAvailable}`
    );

    if (!isAvailable) {
      logTransformStep(
        'MANAGER_PROVIDER_UNAVAILABLE',
        {
          provider: providerName,
          fallbackAttempt: true
        },
        `Provider '${providerName}' is not available - this may trigger fallback`,
        'warn'
      );
      throw new ProviderError(
        `Provider '${providerName}' is not available`,
        'PROVIDER_UNAVAILABLE',
        true
      );
    }

    logTransformStep(
      'MANAGER_PROVIDER_SUCCESS',
      {
        provider: providerName
      },
      `Successfully selected provider: ${providerName}`
    );

    return provider;
  }

  async validateProvider(name?: string): Promise<void> {
    const provider = await this.getProvider(name);
    const validation = await provider.validateConfig();

    if (!validation.valid) {
      throw new ProviderError(
        `Provider '${provider.name}' configuration is invalid: ${validation.errors?.join(', ')}`,
        'PROVIDER_CONFIG_INVALID'
      );
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  setCurrentProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new ProviderError(
        `Cannot set provider '${name}' - not registered`,
        'PROVIDER_NOT_FOUND'
      );
    }
    this.currentProvider = name;
  }
}

// Singleton instance
export const providerManager = new ProviderManager();