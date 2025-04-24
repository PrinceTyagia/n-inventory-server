export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: any;
  
    constructor(message: string, statusCode: number, isOperational = true, details?: any) {
      super(message);
  
      this.name = new.target.name;
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      this.details = details;
  
      Object.setPrototypeOf(this, new.target.prototype); // Ensures instanceof works
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
      super(message, 404);
      Object.setPrototypeOf(this, NotFoundError.prototype);
    }
  }

  export class ValidationError extends AppError {
    constructor(message = 'Invalid request data', details?: any) {
      super(message, 400, true, details);
      Object.setPrototypeOf(this, ValidationError.prototype);
    }
  }
  export class AuthError extends AppError {
    constructor(message = 'Unauthorized access') {
      super(message, 401);
      Object.setPrototypeOf(this, AuthError.prototype);
    }
  }
  
  export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden: Access denied') {
      super(message, 403);
      Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
  }
  
  export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details?: any) {
      super(message, 500, true, details);
      Object.setPrototypeOf(this, DatabaseError.prototype);
    }
  }
  export class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later') {
      super(message, 429);
      Object.setPrototypeOf(this, RateLimitError.prototype);
    }
  }
  