// Minimal typing of the Turnstile client API used by public/app.js
// (https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).
interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  execution?: 'render' | 'execute';
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  callback?: (token: string) => void;
  'error-callback'?: (code: string) => boolean | void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  'unsupported-callback'?: () => void;
}
interface TurnstileApi {
  render(container: string | HTMLElement, options: TurnstileRenderOptions): string | undefined;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
  getResponse(widgetId?: string): string | undefined;
  execute(container: string | HTMLElement, options?: TurnstileRenderOptions): void;
}
declare const turnstile: TurnstileApi;
