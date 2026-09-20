#!/usr/bin/env bash
# Tail or dump logs for whisper-flow's containers on the VPS.
# Run from the compose directory (e.g. /home/ubuntu/whisper-flow).
#
# Usage:
#   ./scripts/getlogs.sh                 # status + last 50 lines of every service
#   ./scripts/getlogs.sh backend         # last 50 lines of one service
#   ./scripts/getlogs.sh backend -f      # follow one service
#   ./scripts/getlogs.sh -f              # follow every service
set -euo pipefail

PROJECT_NAME=$(basename "$PWD")
SERVICES=(minio minio-init backend-migrate backend worker frontend)

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \?//'
  echo
  echo "Services: ${SERVICES[*]}"
}

follow=false
service=""
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
    -f|--follow)
      follow=true
      ;;
    *)
      service="$arg"
      ;;
  esac
done

container_name() {
  echo "${PROJECT_NAME}_${1}_1"
}

if [ -n "$service" ]; then
  name=$(container_name "$service")
  if [ "$follow" = true ]; then
    exec podman logs -f "$name"
  else
    podman logs --tail=50 "$name"
  fi
  exit 0
fi

if [ "$follow" = true ]; then
  names=()
  for svc in "${SERVICES[@]}"; do
    names+=("$(container_name "$svc")")
  done
  exec podman compose -f docker-compose.prod.yml logs -f "${names[@]}"
fi

echo "== podman compose ps =="
podman compose -f docker-compose.prod.yml ps
echo

for svc in "${SERVICES[@]}"; do
  name=$(container_name "$svc")
  echo "== $svc ($name) =="
  podman logs --tail=50 "$name" 2>&1 || echo "(no container named $name)"
  echo
done
