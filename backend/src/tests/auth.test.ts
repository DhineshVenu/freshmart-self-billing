import { afterEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { AuthenticatedUser, generateToken } from "../middleware/auth.js";

const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

describe("JWT configuration", () => {
  it("requires an explicit signing secret", () => {
    delete process.env.JWT_SECRET;

    const user: AuthenticatedUser = {
      userId: "test-user",
      email: "customer@example.test",
      role: "customer",
      name: "Test Customer",
    };

    expect(() => generateToken(user)).toThrow(
      "JWT_SECRET environment variable is required."
    );
  });

  it("signs tokens with the configured secret", () => {
    const secret = "unit-test-secret-that-is-not-used-outside-tests";
    process.env.JWT_SECRET = secret;

    const user: AuthenticatedUser = {
      userId: "test-user",
      email: "customer@example.test",
      role: "customer",
      name: "Test Customer",
    };

    const token = generateToken(user);
    expect(jwt.verify(token, secret)).toMatchObject(user);
  });
});
