import { ImageProvider } from '../types.js';
import type { TransformInput, TransformResult, ProviderCapabilities, ValidationResult } from '@photomaton/shared';
export declare class MockProvider implements ImageProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    validateConfig(): Promise<ValidationResult>;
    getRequiredEnvVars(): string[];
    getCapabilities(): ProviderCapabilities;
    transform(input: TransformInput): Promise<TransformResult>;
}
//# sourceMappingURL=index.d.ts.map