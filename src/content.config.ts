// Build-time content collections.
//
// The `notes` collection was retired from the static `glob` loader and moved to
// a live Postgres-backed collection in `src/live.config.ts` (`getLiveCollection`
// / `getLiveEntry`). No build-time collections remain.
export const collections = {};
