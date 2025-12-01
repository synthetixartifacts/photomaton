import type { Request, Response, NextFunction } from 'express';
export declare class ValidationError extends Error {
    details?: any | undefined;
    constructor(message: string, details?: any | undefined);
}
export declare class DatabaseError extends Error {
    constructor(message: string);
}
export declare class FileError extends Error {
    constructor(message: string);
}
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): Response | void;
//# sourceMappingURL=error.d.ts.map