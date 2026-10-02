import * as net from "net";
export async function randomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}

export class UnreachableError extends Error {
  constructor(message: string = "This code path should be unreachable.") {
    super(message);
    this.name = "UnreachableError";
  }
}

export function isTargetUrl(currentUrl: string, targetUrl: string): boolean {
  const current = new URL(currentUrl);
  const target = new URL(targetUrl);

  if (
    current.protocol !== target.protocol ||
    current.hostname !== target.hostname ||
    current.pathname !== target.pathname
  ) {
    return false;
  }

  const currentParams = new URLSearchParams(current.search);
  const targetParams = new URLSearchParams(target.search);

  for (const [key, value] of targetParams.entries()) {
    if (currentParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}
