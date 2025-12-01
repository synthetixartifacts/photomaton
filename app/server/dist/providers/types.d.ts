import type { TransformInput, TransformResult, ProviderCapabilities, ValidationResult } from '@photomaton/shared';
export interface ImageProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    validateConfig(): Promise<ValidationResult>;
    transform(input: TransformInput): Promise<TransformResult>;
    getRequiredEnvVars(): string[];
    getCapabilities(): ProviderCapabilities;
}
export declare class ProviderError extends Error {
    code: string;
    retry: boolean;
    constructor(message: string, code?: string, retry?: boolean);
}
//# sourceMappingURL=types.d.ts.map