# KENUXA REACH — Monorepo Reference

The actual KENUXA REACH codebase lives at:

```
C:\Users\HomePC\Desktop\kenuxa-reach\
```

This folder is a placeholder in the monorepo. Once the full monorepo migration is complete, the reach app will be moved here.

## Current Status
- Phase 5 complete (intelligence platform, marketplace, wallet, activation engine)
- Standalone Supabase project
- Local KENUX wallet (to be migrated to Core)
- Local AI calls (to be routed through Core gateway)

## Migration Plan
See [docs/migration-guide.md](../../docs/migration-guide.md) for the step-by-step plan to connect REACH to Core services.

## Adding to monorepo (when ready)
```bash
# From KENUXA/ root:
mv ../kenuxa-reach apps/reach
# Update apps/reach/package.json name to @kenuxa/reach
# Add @kenuxa/sdk dependency
# Follow migration-guide.md
```
