process.env.KENUXA_OPS_TEST_PROJECTS_SERIAL = "1";
process.env.KENUXA_OPS_VITEST_MAX_WORKERS = "1";

await import("./test-projects.mjs");
