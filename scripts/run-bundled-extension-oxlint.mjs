import { runExtensionOxlint } from "./lib/run-extension-oxlint.mjs";

runExtensionOxlint({
  roots: ["extensions"],
  toolName: "oxlint-bundled-extensions",
  lockName: "oxlint-bundled-extensions",
  tempDirPrefix: "KENUXA OPS-bundled-extension-oxlint-",
  emptyMessage: "No bundled extension files found.",
});
