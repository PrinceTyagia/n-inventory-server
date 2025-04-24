"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.DatabaseError = exports.ForbiddenError = exports.AuthError = exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode, isOperational = true, details) {
        super(message);
        this.name = new.target.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype); // Ensures instanceof works
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message = 'Invalid request data', details) {
        super(message, 400, true, details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class AuthError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}
exports.AuthError = AuthError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden: Access denied') {
        super(message, 403);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details) {
        super(message, 500, true, details);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
exports.DatabaseError = DatabaseError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later') {
        super(message, 429);
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=index.js.map