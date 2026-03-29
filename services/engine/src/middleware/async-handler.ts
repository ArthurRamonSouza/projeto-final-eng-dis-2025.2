import type { NextFunction } from "express";

export function asyncHandler<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima
    T extends (req: any, res: any, next: NextFunction) => unknown,
>(fn: T): T {
    return ((req, res, next: NextFunction) => {
        void Promise.resolve(fn(req, res, next)).catch(next);
    }) as T;
}
