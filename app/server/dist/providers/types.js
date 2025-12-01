export class ProviderError extends Error {
    code;
    retry;
    constructor(message, code = 'PROVIDER_ERROR', retry = false) {
        super(message);
        this.code = code;
        this.retry = retry;
        this.name = 'ProviderError';
    }
}
//# sourceMappingURL=types.js.map