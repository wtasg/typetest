#!/usr/bin/env bash
set -eu

# Usage: run.sh [--execute]
# Default: dry-run. Pass --execute to actually run dev servers.

# Load environment variables from .env if it exists
if [ -f .env ]; then
	export $(grep -v '^#' .env | xargs)
fi

EXECUTE=false
for arg in "$@"; do
	case "$arg" in
	--execute) EXECUTE=true ;;
	--help)
		echo "Usage: $0 [--execute]"
		exit 0
		;;
	*)
		echo "Unknown arg: $arg"
		echo "Usage: $0 [--execute]"
		exit 2
		;;
	esac
done

CMD_SERVER_RUN="(cd server && go run ./cmd/server)"
CMD_CLIENT_DEV="(cd client && npm run dev)"

if [ "$EXECUTE" = false ]; then
	echo "DRY RUN: The following commands would be started (foreground processes):"
	echo "  $CMD_SERVER_RUN"
	echo "  $CMD_CLIENT_DEV"
	echo "Run with --execute to start both."
	exit 0
fi

# Run server in background, client in foreground
echo "Starting server in background: $CMD_SERVER_RUN"
(eval "$CMD_SERVER_RUN") &
SERVER_PID=$!

echo "Server started (pid=$SERVER_PID). Starting client (foreground): $CMD_CLIENT_DEV"

# Trap to kill server when client stops
trap 'echo "Stopping server (pid=$SERVER_PID)"; kill $SERVER_PID 2>/dev/null || true' EXIT

exec bash -lc "$CMD_CLIENT_DEV"
