/**
 * @module utils/decorators
 *
 * Custom TypeScript method & class decorators for the Supermarket Billing System.
 * Requires: experimentalDecorators + emitDecoratorMetadata (already enabled in tsconfig).
 *
 * Exported decorators:
 *  - @LogExecution   — logs method name, execution time, and errors for async service methods
 *  - @ValidateInput  — guards string arguments: throws before the method body runs if any
 *                      required string argument is empty or whitespace-only
 *  - @Singleton      — class decorator that enforces a single instance per service class
 */

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

/** Minimal shape of any class constructor. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => object;

// ---------------------------------------------------------------------------
// @LogExecution — Method decorator
// ---------------------------------------------------------------------------

/**
 * Wraps an async service method so that:
 *   1. A "[ClassName] methodName → started" log is printed on every call.
 *   2. On success, "[ClassName] methodName → OK (Xms)" is printed.
 *   3. On failure, "[ClassName] methodName → ERROR (Xms)" is printed and the
 *      original error is re-thrown unchanged so Express error middleware still
 *      receives it.
 *
 * Usage:
 *   @LogExecution
 *   public async processCheckout(...) { ... }
 */
export function LogExecution(
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
  const className = (target as { constructor: { name: string } }).constructor.name;

  descriptor.value = async function (this: unknown, ...args: unknown[]) {
    const start = Date.now();
    console.log(`[${className}] ${propertyKey} -> started`);

    try {
      const result = await originalMethod.apply(this, args);
      const ms = Date.now() - start;
      console.log(`[${className}] ${propertyKey} -> OK (${ms}ms)`);
      return result;
    } catch (err: unknown) {
      const ms = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${className}] ${propertyKey} -> ERROR (${ms}ms): ${message}`);
      throw err; // re-throw so Express error handler still receives it
    }
  };

  return descriptor;
}

// ---------------------------------------------------------------------------
// @ValidateInput — Method decorator
// ---------------------------------------------------------------------------

/**
 * Inspects all arguments before the method body runs.
 * Throws an Error immediately if any argument that is a string is empty
 * or contains only whitespace — preventing wasted DB round-trips.
 *
 * Validation message includes the method name for easy tracing in logs.
 *
 * Usage:
 *   @ValidateInput
 *   public async getProductByBarcode(barcode: string) { ... }
 */
export function ValidateInput(
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

  descriptor.value = async function (this: unknown, ...args: unknown[]) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === "string" && arg.trim() === "") {
        throw new Error(
          `[${propertyKey}] argument at position ${i} must not be empty`
        );
      }
    }
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

// ---------------------------------------------------------------------------
// @Singleton — Class decorator
// ---------------------------------------------------------------------------

/**
 * Enforces that only one instance of the decorated class is ever created.
 * If the constructor is called a second time, the existing instance is returned.
 *
 * This is a compile-time + runtime guarantee that reinforces the manual
 * singleton exports (e.g. `export const checkoutService = new CheckoutService()`)
 * already used throughout the codebase.
 *
 * Usage:
 *   @Singleton
 *   export class CheckoutService { ... }
 */
export function Singleton<T extends AnyConstructor>(Base: T): T {
  let instance: InstanceType<T> | null = null;

  // Return an anonymous subclass that intercepts the constructor
  const SingletonClass = class extends Base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      if (instance) {
        // Return the already-created instance instead of constructing again
        return instance;
      }
      super(...args);
      instance = this as InstanceType<T>;
    }
  };

  // Preserve the original class name in stack traces and logs
  Object.defineProperty(SingletonClass, "name", { value: Base.name });

  return SingletonClass as T;
}
