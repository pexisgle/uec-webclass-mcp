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
