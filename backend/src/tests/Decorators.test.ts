import { describe, it, expect } from "vitest";
import { ValidateInput, Singleton, LogExecution } from "../utils/decorators.js";

@Singleton
class SampleService {
  @ValidateInput
  async findByName(name: string): Promise<string> {
    return `Found ${name}`;
  }

  @LogExecution
  async calculateSum(a: number, b: number): Promise<number> {
    return a + b;
  }
}

describe("TypeScript Custom Decorators", () => {
  it("@ValidateInput should reject empty or whitespace strings", async () => {
    const service = new SampleService();

    await expect(service.findByName("")).rejects.toThrow("must not be empty");
    await expect(service.findByName("   ")).rejects.toThrow("must not be empty");
    await expect(service.findByName("Valid Item")).resolves.toBe("Found Valid Item");
  });

  it("@Singleton should return the identical class instance across multiple new calls", () => {
    const instanceA = new SampleService();
    const instanceB = new SampleService();
    expect(instanceA).toBe(instanceB);
  });

  it("@LogExecution should execute successfully and return the wrapped result", async () => {
    const service = new SampleService();
    const result = await service.calculateSum(15, 25);
    expect(result).toBe(40);
  });
});
