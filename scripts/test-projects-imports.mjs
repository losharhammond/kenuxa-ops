process.env.KENUXA_OPS_VITEST_IMPORT_DURATIONS = "1";
process.env.KENUXA_OPS_VITEST_PRINT_IMPORT_BREAKDOWN = "1";

await import("./test-projects.mjs");
