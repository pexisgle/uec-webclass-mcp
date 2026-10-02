import { McpServer } from "@modelcontextprotocol/server";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";
import session from "./session.ts";

const server = new McpServer({ name: "notes", version: "1.0.0" });

server.registerTool(
  "whoami",
  {
    description: "Returns the information of the user.",
    outputSchema: toStandardJsonSchema(
      v.union([
        v.object({
          name: v.string(),
          emails: v.array(v.string()),
        }),
        v.object({
          error: v.string(),
        }),
      ]),
    ),
  },
  async () => {
    try {
      const whoami = await session.whoami();
      return {
        structuredContent: whoami,
        content: [
          {
            type: "text",
            text: JSON.stringify(whoami, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        structuredContent: { error: (error as Error).message },
        content: [
          {
            type: "text",
            text: `Error: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
);

export default server;
