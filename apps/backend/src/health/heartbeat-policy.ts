// A worker's heartbeat is considered stale (down) once it's older than this
// window. Default worker heartbeat interval is 10s (HEARTBEAT_INTERVAL_SECONDS
// in apps/worker/src/worker/config.py) - the two are not shared code, so keep
// them in sync by hand if either changes.
export const WORKER_STALE_THRESHOLD_SECONDS = 30
