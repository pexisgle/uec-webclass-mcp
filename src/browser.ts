import { chromium } from "playwright-core";

// Keep browser startup and shutdown here so Lightpanda can replace Chromium later.
export async function launchBrowser() {
  const browser = await chromium.launch();
  return {
    browser,
    close: () => browser.close(),
  };
}
