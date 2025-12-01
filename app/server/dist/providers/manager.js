import { ProviderError } from './types.js';
import { MockProvider } from './mock/index.js';
// import { GeminiImagenProvider } from './gemini-imagen/index.js';
export class ProviderManager {
    providers = new Map();
    currentProvider;
    constructor() {
        // Register available providers
        this.registerProvider(new MockProvider());
        // Future providers
        // if (process.env.GEMINI_API_KEY) {
        //   this.registerProvider(new GeminiImagenProvider());
        // }
        // Set current provider from environment or default to mock
        this.currentProvider = process.env.IMAGE_PROVIDER || 'mock';
    }
    registerProvider(provider) {
        this.providers.set(provider.name, provider);
    }
    async getProvider(name) {
        const providerName = name || this.currentProvider;
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new ProviderError(`Provider '${providerName}' not found. Available: ${Array.from(this.providers.keys()).join(', ')}`, 'PROVIDER_NOT_FOUND');
        }
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
            throw new ProviderError(`Provider '${providerName}' is not available`, 'PROVIDER_UNAVAILABLE', true);
        }
        return provider;
    }
    async validateProvider(name) {
        const provider = await this.getProvider(name);
        const validation = await provider.validateConfig();
        if (!validation.valid) {
            throw new ProviderError(`Provider '${provider.name}' configuration is invalid: ${validation.errors?.join(', ')}`, 'PROVIDER_CONFIG_INVALID');
        }
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    setCurrentProvider(name) {
        if (!this.providers.has(name)) {
            throw new ProviderError(`Cannot set provider '${name}' - not registered`, 'PROVIDER_NOT_FOUND');
        }
        this.currentProvider = name;
    }
}
// Singleton instance
export const providerManager = new ProviderManager();
//# sourceMappingURL=manager.js.map