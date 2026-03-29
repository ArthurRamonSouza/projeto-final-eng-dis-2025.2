export class HttpError extends Error {
    readonly statusCode: number;
    readonly code?: string;
    readonly payload?: Record<string, unknown>;

    constructor(
        statusCode: number,
        message: string,
        options?: { code?: string; payload?: Record<string, unknown> },
    ) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.code = options?.code;
        this.payload = options?.payload;
    }
}
