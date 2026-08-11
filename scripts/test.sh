#!/usr/bin/env bash
set -eu

# Usage: test.sh [--execute]
# Default: dry-run. Pass --execute to actually run tests.

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

CMD_SERVER_TEST="(cd server && go test ./internal/api/... 2>&1 || true)"
CMD_CLIENT_TEST="(cd client && node_modules/.bin/vitest run)"

if [ "$EXECUTE" = false ]; then
	echo "DRY RUN: The following test commands would run:"
	echo "  $CMD_SERVER_TEST"
	echo "  $CMD_CLIENT_TEST"
	echo "Run with --execute to run tests."
	exit 0
fi

echo "Running server tests: $CMD_SERVER_TEST"
eval "$CMD_SERVER_TEST"

echo "Running client tests (if configured): $CMD_CLIENT_TEST"
eval "$CMD_CLIENT_TEST"

echo "Tests finished."
