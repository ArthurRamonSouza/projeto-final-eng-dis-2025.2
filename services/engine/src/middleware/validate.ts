import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<T extends z.ZodType>(schema: T) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.body = schema.parse(req.body) as Request["body"];
        next();
    };
}

export function validateParams<T extends z.ZodType>(schema: T) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.params = schema.parse(req.params) as Request["params"];
        next();
    };
}
