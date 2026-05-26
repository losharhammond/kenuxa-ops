/**
 * KENUXA OPS — Real Playwright Browser Control
 *
 * Provides high-level browser automation actions for the OPS runtime.
 * Wraps Playwright's chromium launcher so the AI agent can:
 *   - Navigate to URLs
 *   - Click elements (by text, role, selector, or coordinate)
 *   - Type into fields
 *   - Extract page content / take screenshots
 *   - Wait for conditions
 *   - Execute arbitrary JavaScript
 *
 * Usage:
 *   const ctrl = await KenuxaBrowserControl.launch({ headless: false });
 *   await ctrl.navigate("https://example.com");
 *   await ctrl.click({ text: "Sign in" });
 *   await ctrl.type({ selector: "input[name=email]", value: "user@kenuxa.ai" });
 *   const text = await ctrl.extractText();
 *   await ctrl.close();
 */

// Playwright is an optional peer dependency — loaded dynamically so the
// core runtime doesn't hard-fail if not installed.
type Playwright = typeof import("playwright");
type Browser    = import("playwright").Browser;
type Page       = import("playwright").Page;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrowserLaunchOptions {
  headless?: boolean;
  /** Browser channel: 'chromium' | 'chrome' | 'msedge'. Default: 'chromium' */
  channel?: string;
  /** Initial viewport size */
  viewport?: { width: number; height: number };
  /** Extra browser args */
  args?: string[];
}

export interface ClickOptions {
  /** Click an element whose visible text matches (partial, case-insensitive). */
  text?: string;
  /** CSS / XPath selector */
  selector?: string;
  /** ARIA role e.g. 'button', 'link' */
  role?: string;
  /** Screen coordinate fallback */
  x?: number;
  y?: number;
  /** Max wait ms for element. Default: 8000 */
  timeout?: number;
}

export interface TypeOptions {
  selector: string;
  value: string;
  /** If true, clears the field before typing. Default: true */
  clear?: boolean;
  /** Delay ms between keystrokes for human-like typing. Default: 0 */
  delay?: number;
}

export interface ExtractOptions {
  /** CSS selector to scope extraction. Default: 'body' */
  selector?: string;
  /** 'text' = innerText, 'html' = innerHTML, 'markdown' = basic MD conversion */
  format?: "text" | "html" | "markdown";
}

export interface ScreenshotOptions {
  /** Capture only a specific element */
  selector?: string;
  /** 'png' | 'jpeg'. Default: 'png' */
  type?: "png" | "jpeg";
  /** Return as base64 data URL */
  asDataUrl?: boolean;
}

export interface BrowserActionResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

// ─── Control ──────────────────────────────────────────────────────────────────

export class KenuxaBrowserControl {
  private constructor(
    private readonly _browser: Browser,
    private readonly _page: Page,
  ) {}

  /** Launch a new browser and return a control instance. */
  static async launch(options: BrowserLaunchOptions = {}): Promise<KenuxaBrowserControl> {
    const pw: Playwright = await loadPlaywright();
    const browser = await pw.chromium.launch({
      headless: options.headless ?? false,
      channel:  options.channel as "chrome" | "msedge" | undefined,
      args:     options.args ?? [],
    });
    const context = await browser.newContext({
      viewport: options.viewport ?? { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KENUXA-OPS/1.0",
    });
    const page = await context.newPage();
    return new KenuxaBrowserControl(browser, page);
  }

  /** Navigate to a URL. Returns when the page is interactive. */
  async navigate(url: string, waitUntil: "load" | "domcontentloaded" | "networkidle" = "domcontentloaded"): Promise<BrowserActionResult> {
    try {
      await this._page.goto(url, { waitUntil, timeout: 30_000 });
      return { ok: true, data: { url: this._page.url(), title: await this._page.title() } };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Click an element. Priority: text match > role > selector > coordinate. */
  async click(options: ClickOptions): Promise<BrowserActionResult> {
    const timeout = options.timeout ?? 8000;
    try {
      if (options.text) {
        const loc = this._page.getByText(options.text, { exact: false });
        await loc.first().click({ timeout });
      } else if (options.role) {
        const loc = this._page.getByRole(options.role as Parameters<Page["getByRole"]>[0]);
        await loc.first().click({ timeout });
      } else if (options.selector) {
        await this._page.click(options.selector, { timeout });
      } else if (options.x !== undefined && options.y !== undefined) {
        await this._page.mouse.click(options.x, options.y);
      } else {
        return { ok: false, error: "click: no target specified" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Type text into an input field. */
  async type(options: TypeOptions): Promise<BrowserActionResult> {
    try {
      const { selector, value, clear = true, delay = 0 } = options;
      if (clear) {
        await this._page.fill(selector, "");
      }
      await this._page.type(selector, value, { delay });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Press a key or key combination, e.g. 'Enter', 'Control+a'. */
  async press(key: string, selector?: string): Promise<BrowserActionResult> {
    try {
      if (selector) {
        await this._page.press(selector, key);
      } else {
        await this._page.keyboard.press(key);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Extract text content from the page or a scoped element. */
  async extractText(options: ExtractOptions = {}): Promise<BrowserActionResult> {
    const selector = options.selector ?? "body";
    try {
      const text = await this._page.$eval(selector, (el) => (el as HTMLElement).innerText ?? "");
      return { ok: true, data: { text: text.trim() } };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Take a screenshot. */
  async screenshot(options: ScreenshotOptions = {}): Promise<BrowserActionResult> {
    try {
      const type = options.type ?? "png";
      let buffer: Buffer;
      if (options.selector) {
        const element = await this._page.$(options.selector);
        if (!element) return { ok: false, error: `screenshot: selector not found: ${options.selector}` };
        buffer = await element.screenshot({ type }) as Buffer;
      } else {
        buffer = await this._page.screenshot({ type, fullPage: false }) as Buffer;
      }
      if (options.asDataUrl) {
        const b64 = buffer.toString("base64");
        return { ok: true, data: { dataUrl: `data:image/${type};base64,${b64}` } };
      }
      return { ok: true, data: { buffer } };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Wait for an element to appear. */
  async waitFor(selector: string, timeoutMs = 10_000): Promise<BrowserActionResult> {
    try {
      await this._page.waitForSelector(selector, { timeout: timeoutMs });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Execute JavaScript in the page context. */
  async evaluate<T = unknown>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<BrowserActionResult> {
    try {
      const result = await this._page.evaluate(script as () => T, ...args);
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Current page URL. */
  get url(): string {
    return this._page.url();
  }

  /** Current page title. */
  async title(): Promise<string> {
    return this._page.title();
  }

  /** Close the browser. */
  async close(): Promise<void> {
    try {
      await this._browser.close();
    } catch {
      // Already closed
    }
  }
}

// ─── Playwright loader ────────────────────────────────────────────────────────

async function loadPlaywright(): Promise<Playwright> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (await import("playwright")) as Playwright;
  } catch {
    throw new Error(
      "KENUXA OPS: Playwright is not installed.\n" +
      "Run: npm install playwright && npx playwright install chromium",
    );
  }
}

// ─── Singleton convenience API ────────────────────────────────────────────────

let _sharedInstance: KenuxaBrowserControl | null = null;

export async function getBrowserControl(options?: BrowserLaunchOptions): Promise<KenuxaBrowserControl> {
  if (!_sharedInstance) {
    _sharedInstance = await KenuxaBrowserControl.launch(options);
  }
  return _sharedInstance;
}

export async function closeBrowserControl(): Promise<void> {
  if (_sharedInstance) {
    await _sharedInstance.close();
    _sharedInstance = null;
  }
}
