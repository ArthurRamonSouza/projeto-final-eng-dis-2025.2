import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/http-error.js";

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
): void {
    void next;
    if (err instanceof HttpError) {
        const body: Record<string, unknown> = {
            error: err.code ?? "HTTP_ERROR",
            message: err.message,
            ...err.payload,
        };
        res.status(err.statusCode).json(body);
        return;
    }

    if (err instanceof ZodError) {
        res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: err.flatten(),
        });
        return;
    }

    console.error(err);
    res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
    });
}
