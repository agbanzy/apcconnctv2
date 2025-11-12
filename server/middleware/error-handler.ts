import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

export function createError(
  message: string,
  statusCode: number = 500,
  details?: any
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  error.details = details;
  return error;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("[Error Handler]", {
    statusCode,
    message,
    details: err.details,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
