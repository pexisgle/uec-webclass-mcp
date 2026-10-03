import { lightpanda } from "@lightpanda/browser";
import { chromium } from "playwright-core";
import { randomPort } from "./utils.ts";

export async function launchBrowser() {
  const port = await randomPort();
  const proc = await lightpanda.serve({ host: "127.0.0.1", port });
  proc.stdout.resume();
  proc.stderr.pipe(process.stderr);
  const stop = () => {
    proc.stdout.destroy();
    proc.stderr.destroy();
    proc.kill();
  };

  try {
    const browser = await chromium.connectOverCDP(`ws://127.0.0.1:${port}`);
    return {
      browser,
      close: async () => {
        try {
          await browser.close();
        } finally {
          stop();
        }
      },
    };
  } catch (error) {
    stop();
    throw error;
  }
}
