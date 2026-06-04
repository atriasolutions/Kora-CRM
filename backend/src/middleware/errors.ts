import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(message = 'Recurso no encontrado'): AppError {
  return new AppError(404, message, 'NOT_FOUND')
}

export function badRequest(message: string): AppError {
  return new AppError(400, message, 'BAD_REQUEST')
}

/** Conflicto de concurrencia (reintentar o refrescar inventario). */
export function conflict(message: string): AppError {
  return new AppError(409, message, 'CONFLICT')
}

export function unauthorized(message = 'Debes iniciar sesión'): AppError {
  return new AppError(401, message, 'UNAUTHORIZED')
}

export function forbidden(message = 'No tienes permiso para esta acción'): AppError {
  return new AppError(403, message, 'FORBIDDEN')
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code ?? 'APP_ERROR',
        message: err.message,
      },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: err.flatten(),
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  })
}
