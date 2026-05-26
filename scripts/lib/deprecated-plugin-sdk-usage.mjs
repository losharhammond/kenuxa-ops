import deprecatedPublicPluginSdkSubpaths from "./plugin-sdk-deprecated-public-subpaths.json" with { type: "json" };

const DEPRECATED_PLUGIN_SDK_EXTRA_SPECIFIERS = [
  "KENUXA OPS/plugin-sdk",
  "KENUXA OPS/plugin-sdk/agent-dir-compat",
  "KENUXA OPS/plugin-sdk/test-utils",
];

export function buildDeprecatedPluginSdkModuleSpecifiers(
  deprecatedSubpaths = deprecatedPublicPluginSdkSubpaths,
) {
  return [
    ...new Set([
      ...DEPRECATED_PLUGIN_SDK_EXTRA_SPECIFIERS,
      ...deprecatedSubpaths.map((subpath) => `KENUXA OPS/plugin-sdk/${subpath}`),
    ]),
  ].toSorted();
}
