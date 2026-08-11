#!/usr/bin/env bash
set -eu

# Usage: build.sh [--execute]
# Default behavior: dry-run (shows commands). Pass --execute to actually run.

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

# Commands to run
CMD_CLIENT_INSTALL="(cd client && npm ci)"
CMD_CLIENT_BUILD="(cd client && npm run build)"
CMD_SERVER_BUILD="(cd server && go build -o ./bin/typetest ./cmd/server)"

if [ "$EXECUTE" = false ]; then
	echo "DRY RUN: The following commands would be executed:"
	echo "  $CMD_CLIENT_INSTALL"
	echo "  $CMD_CLIENT_BUILD"
	echo "  $CMD_SERVER_BUILD"
	echo "Run with --execute to perform the actions."
	exit 0
fi

# Execute
echo "Executing: $CMD_CLIENT_INSTALL"
eval "$CMD_CLIENT_INSTALL"

echo "Executing: $CMD_CLIENT_BUILD"
eval "$CMD_CLIENT_BUILD"

echo "Executing: $CMD_SERVER_BUILD"
eval "$CMD_SERVER_BUILD"

echo "Build finished."
