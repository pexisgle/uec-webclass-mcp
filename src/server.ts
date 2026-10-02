import { McpServer } from "@modelcontextprotocol/server";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";
import session, { timetableSchema } from "./session.ts";
import { rootLogger } from "./log.ts";

const server = new McpServer({ name: "uec-webclass-mcp", version: "0.0.0" });
const serverLogger = rootLogger.getChild("server");

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
      serverLogger.error`Error in whoami: ${(error as Error).message}`;
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

server.registerTool(
  "get-timetable",
  {
    description: "Returns the timetable of the user.",
    inputSchema: toStandardJsonSchema(
      v.union([
        v.object({
          year: v.string(),
          semester: v.string(),
        }),
        v.object({}),
      ]),
    ),
    outputSchema: toStandardJsonSchema(
      v.union([
        timetableSchema,
        v.object({
          error: v.string(),
        }),
      ]),
    ),
  },
  async (input) => {
    try {
      const timetable = await session.getTimetable(
        "year" in input ? { year: input.year, semester: input.semester } : undefined,
      );
      serverLogger.info(timetable);
      return {
        structuredContent: timetable,
        content: [
          {
            type: "text",
            text: JSON.stringify(timetable, null, 2),
          },
        ],
      };
    } catch (error) {
      serverLogger.error`Error in get-timetable: ${(error as Error).message}`;
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
