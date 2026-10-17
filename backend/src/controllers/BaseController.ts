import { Response } from "express";

/**
 * Abstract Base Controller demonstrating OOP Inheritance and Abstraction.
 * Provides standardized HTTP response helper methods to all child controllers.
 */
export abstract class BaseController {
  /**
   * Protected helper to send standardized HTTP success responses.
   */
  protected sendSuccess<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    message?: string
  ): void {
    res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data,
    });
  }

  /**
   * Protected helper to send standardized HTTP error responses.
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 400
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
