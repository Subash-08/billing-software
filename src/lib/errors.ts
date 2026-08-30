export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'Forbidden: Access denied to this business resource') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ForbiddenError extends AuthorizationError {}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Requested resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUSINESS_RULE_ERROR', 422, details);
  }
}
