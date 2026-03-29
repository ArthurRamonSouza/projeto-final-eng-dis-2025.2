import type { NextFunction } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncHandler<T extends (req: any, res: any, next: any) => unknown>(fn: T): T {
    return ((req, res, next: NextFunction) => {
        void Promise.resolve(fn(req, res, next)).catch(next);
    }) as T;
}
