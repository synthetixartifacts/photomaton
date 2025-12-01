import { ImageProvider } from './types.js';
export declare class ProviderManager {
    private providers;
    private currentProvider;
    constructor();
    registerProvider(provider: ImageProvider): void;
    getProvider(name?: string): Promise<ImageProvider>;
    validateProvider(name?: string): Promise<void>;
    getAvailableProviders(): string[];
    setCurrentProvider(name: string): void;
}
export declare const providerManager: ProviderManager;
//# sourceMappingURL=manager.d.ts.map