#!/usr/bin/env bash
# refresh.sh — Full MAUDE data refresh pipeline
#
# Usage:
#   ./refresh.sh                    # fetch current month + full refresh
#   ./refresh.sh --since 2026-01   # fetch from Jan 2026 forward
#   ./refresh.sh --skip-fetch      # skip fetch, just re-aggregate/upload
#   ./refresh.sh --skip-upload     # aggregate + enrich only (dry run)
#
# Prerequisites:
#   pip install firebase-admin --break-system-packages
#   GOOGLE_APPLICATION_CREDENTIALS must point to the service-account JSON
#   (defaults to maude-safety-dashboard-firebase-adminsdk-fbsvc-6fa5f50db9.json)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/refresh_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$SCRIPT_DIR/logs"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── Parse args ────────────────────────────────────────────────────────────────
SKIP_FETCH=0
SKIP_UPLOAD=0
SINCE_ARG=""

for arg in "$@"; do
  case $arg in
    --skip-fetch)  SKIP_FETCH=1 ;;
    --skip-upload) SKIP_UPLOAD=1 ;;
    --since=*)     SINCE_ARG="${arg#--since=}" ;;
    --since)       shift; SINCE_ARG="$1" ;;
  esac
done

# ── Credentials ───────────────────────────────────────────────────────────────
SA_KEY="$SCRIPT_DIR/maude-safety-dashboard-firebase-adminsdk-fbsvc-6fa5f50db9.json"
if [ -f "$SA_KEY" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$SA_KEY"
fi

if [ "$SKIP_UPLOAD" -eq 0 ] && [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  log "ERROR: GOOGLE_APPLICATION_CREDENTIALS not set and service-account key not found."
  log "       Set the env var or place the key at: $SA_KEY"
  exit 1
fi

log "=== MAUDE refresh started ==="
START_TS=$(date +%s)

# ── Step 1: Fetch ─────────────────────────────────────────────────────────────
if [ "$SKIP_FETCH" -eq 0 ]; then
  log "Step 1/4: Fetching new MAUDE data from openFDA..."
  if [ -n "$SINCE_ARG" ]; then
    python3 "$SCRIPT_DIR/fetch_maude.py" --since "$SINCE_ARG" 2>&1 | tee -a "$LOG_FILE"
  else
    python3 "$SCRIPT_DIR/fetch_maude.py" 2>&1 | tee -a "$LOG_FILE"
  fi
  log "Step 1/4 complete."
else
  log "Step 1/4: Skipped (--skip-fetch)"
fi

# ── Step 2: Aggregate ─────────────────────────────────────────────────────────
log "Step 2/4: Aggregating raw data..."
python3 "$SCRIPT_DIR/aggregate.py" 2>&1 | tee -a "$LOG_FILE"
log "Step 2/4 complete."

# ── Step 3: Enrich ────────────────────────────────────────────────────────────
log "Step 3/4: Enriching with risk scores and trends..."
python3 "$SCRIPT_DIR/enrich_data.py" 2>&1 | tee -a "$LOG_FILE"
log "Step 3/4 complete."

# ── Step 4: Upload ────────────────────────────────────────────────────────────
if [ "$SKIP_UPLOAD" -eq 0 ]; then
  log "Step 4/4: Uploading to Firestore..."
  python3 "$SCRIPT_DIR/upload_to_firestore.py" 2>&1 | tee -a "$LOG_FILE"
  log "Step 4/4 complete."
else
  log "Step 4/4: Skipped (--skip-upload). Enriched files ready in $SCRIPT_DIR"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
ELAPSED=$(( $(date +%s) - START_TS ))
MINS=$(( ELAPSED / 60 ))
SECS=$(( ELAPSED % 60 ))
log "=== Refresh complete in ${MINS}m ${SECS}s. Log: $LOG_FILE ==="
