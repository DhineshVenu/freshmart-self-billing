import "@testing-library/jest-dom";

// Mock HTMLMediaElement methods (for playScanBeep audio)
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};

// Mock window.print
window.print = () => {};

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};

// Mock EventSource for real-time SSE stream tests
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close() {}
}

(globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
