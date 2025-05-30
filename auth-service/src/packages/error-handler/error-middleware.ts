import { AppError } from "./index";
import { Request, Response, NextFunction } from "express";


export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // If it's our custom AppError
  if (err instanceof AppError) {
    console.log(`Error ${req.method} ${req.url} - ${err.message}`);
    
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details && {details: err.details}),
    
    });
  }

  // For unhandled/unexpected errors

  console.error("unhandled error",err); 
  // Optional: log to a logging service
  return res.status(500).json({
    error: "Something went wrong,please try again",
    
  });
};
