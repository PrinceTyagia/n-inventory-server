"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const index_1 = require("./index");
const errorMiddleware = (err, req, res, next) => {
    // If it's our custom AppError
    if (err instanceof index_1.AppError) {
        console.log(`Error ${req.method} ${req.url} - ${err.message}`);
        return res.status(err.statusCode).json(Object.assign({ status: 'error', message: err.message }, (err.details && { details: err.details })));
    }
    // For unhandled/unexpected errors
    console.error("unhandled error", err);
    // Optional: log to a logging service
    return res.status(500).json({
        error: "Something went wrong,please try again",
    });
};
exports.errorMiddleware = errorMiddleware;
