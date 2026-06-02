// ─── Shared error classes (usable in all KENUXA services) ────

export class AppError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = this.constructor.name
  }
}

export class NotFoundError     extends AppError { constructor(m: string) { super(m, 404) } }
export class UnauthorizedError extends AppError { constructor(m: string) { super(m, 401) } }
export class ForbiddenError    extends AppError { constructor(m: string) { super(m, 403) } }
export class ConflictError     extends AppError { constructor(m: string) { super(m, 409) } }
export class BadRequestError   extends AppError { constructor(m: string) { super(m, 400) } }
export class BadGatewayError   extends AppError { constructor(m: string) { super(m, 502) } }

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
