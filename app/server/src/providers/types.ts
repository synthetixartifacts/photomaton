import type {
  TransformInput,
  TransformResult,
  ProviderCapabilities,
  ValidationResult
} from '@photomaton/shared';

export interface ImageProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  validateConfig(): Promise<ValidationResult>;
  transform(input: TransformInput): Promise<TransformResult>;
  getRequiredEnvVars(): string[];
  getCapabilities(): ProviderCapabilities;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string = 'PROVIDER_ERROR',
    public retry: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}