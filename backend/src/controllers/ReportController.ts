import { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { ReportService } from "../services/ReportService.js";

export class ReportController extends BaseController {
  private readonly reportService = new ReportService();

  public getDailyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, storeId } = req.query as Record<string, string>;
      const data = await this.reportService.getDailyReport(
        storeId,
        new Date(startDate),
        new Date(endDate)
      );
      this.sendSuccess(res, data);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public getCategoryReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = "month", storeId } = req.query as Record<string, string>;
      const data = await this.reportService.getCategoryReport(
        storeId,
        period as "week" | "month" | "quarter"
      );
      this.sendSuccess(res, data);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public getPeakHourReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = "month", storeId } = req.query as Record<string, string>;
      const data = await this.reportService.getPeakHourReport(
        storeId,
        period as "week" | "month" | "quarter"
      );
      this.sendSuccess(res, data);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public exportCsv = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, storeId } = req.query as Record<string, string>;
      const csv = await this.reportService.exportToCsv(
        storeId,
        new Date(startDate),
        new Date(endDate)
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="freshmart-report-${startDate}-${endDate}.csv"`
      );
      res.send(csv);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public exportPdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, storeId } = req.query as Record<string, string>;
      const pdfBuffer = await this.reportService.exportToPdf(
        storeId,
        new Date(startDate),
        new Date(endDate)
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="freshmart-report-${startDate}-${endDate}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public generateSnapshot = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, date } = req.body as { storeId?: string; date?: string };
      const targetDate = date ? new Date(date) : new Date();
      const snapshot = await this.reportService.generateDailySnapshot(storeId, targetDate);
      this.sendSuccess(res, snapshot, 201);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };
}
