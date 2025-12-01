import dotenv from 'dotenv';
import { z } from 'zod';
// Load environment variables
dotenv.config();
const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8080').transform(Number),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    DATABASE_URL: z.string().default('file:/data/photomaton.db'),
    UPLOAD_DIR: z.string().default('/data/photos'),
    MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
    CORS_ORIGIN: z.string().default('http://localhost:*'),
    IMAGE_PROVIDER: z.string().default('mock'),
    MOCK_DELAY_MS: z.string().default('2000').transform(Number),
    SESSION_SECRET: z.string().default('change-this-in-production'),
    RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
    ENABLE_DEBUG: z.string().default('false').transform(val => val === 'true'),
    ENABLE_CAROUSEL_AUTO_REFRESH: z.string().default('true').transform(val => val === 'true'),
    CAROUSEL_REFRESH_INTERVAL_MS: z.string().default('5000').transform(Number),
    GEMINI_API_KEY: z.string().optional(),
    REPLICATE_API_TOKEN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
});
const parseConfig = () => {
    try {
        return configSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid configuration:');
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
};
export const config = parseConfig();
// Helper to check if we're in production
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
//# sourceMappingURL=index.js.map