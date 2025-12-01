import pino from 'pino';

// Create a dedicated logger for transform process debugging
const transformLogger = pino({
  name: 'transform-process',
  level: 'debug'
});

// Helper function to log transform step with context
export function logTransformStep(
  step: string,
  context: {
    photoId?: string;
    jobId?: string;
    provider?: string;
    preset?: string;
    [key: string]: any;
  },
  message: string,
  level: 'info' | 'warn' | 'error' | 'debug' = 'info'
) {
  const logData = {
    step,
    timestamp: new Date().toISOString(),
    ...context
  };

  transformLogger[level](logData, message);
}

// Log environment and configuration
export async function logEnvironmentInfo() {
  const envVars = {
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '[SET]' : '[NOT_SET]',
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ? '[SET]' : '[NOT_SET]',
    STABILITY_API_KEY: process.env.STABILITY_API_KEY ? '[SET]' : '[NOT_SET]'
  };

  logTransformStep(
    'ENV_INIT',
    { envVars },
    'Environment variables for transform process'
  );
}

// Log provider availability check
export async function logProviderAvailability(providers: Record<string, boolean>) {
  logTransformStep(
    'PROVIDER_AVAILABILITY',
    { providers },
    'Provider availability check results'
  );
}

// Log provider selection
export async function logProviderSelection(
  requested: string | undefined,
  selected: string,
  reason: string
) {
  logTransformStep(
    'PROVIDER_SELECTION',
    { requestedProvider: requested, selectedProvider: selected, reason },
    `Provider selection: ${reason}`
  );
}

export { transformLogger };