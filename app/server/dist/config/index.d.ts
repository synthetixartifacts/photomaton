export declare const config: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    DATABASE_URL: string;
    UPLOAD_DIR: string;
    MAX_FILE_SIZE: number;
    CORS_ORIGIN: string;
    IMAGE_PROVIDER: string;
    MOCK_DELAY_MS: number;
    SESSION_SECRET: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    ENABLE_DEBUG: boolean;
    ENABLE_CAROUSEL_AUTO_REFRESH: boolean;
    CAROUSEL_REFRESH_INTERVAL_MS: number;
    GEMINI_API_KEY?: string | undefined;
    REPLICATE_API_TOKEN?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
};
export declare const isProduction: () => boolean;
export declare const isDevelopment: () => boolean;
export declare const isTest: () => boolean;
//# sourceMappingURL=index.d.ts.map