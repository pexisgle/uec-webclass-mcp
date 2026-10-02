import * as logtape from "@logtape/logtape";

await logtape.configure({
  sinks: {
    console: logtape.getConsoleSink({
      formatter: logtape.getAnsiColorFormatter({
        level: "full",
        categoryColor: "cyan",
        category: (categories: readonly string[]) => `[${categories.join("][")}]`,
      }),
    }),
  },
  loggers: [
    {
      category: "app",
      lowestLevel: "info",
      sinks: ["console"],
    },

    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
});

export const rootLogger = logtape.getLogger("app");
