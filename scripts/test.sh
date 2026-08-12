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

CMD_SERVER_TEST="(cd server && go test -v ./...)"
CMD_CLIENT_VITEST="(cd client && npm test)"
CMD_CLIENT_E2E="(cd client && npm run test:e2e)"

if [ "$EXECUTE" = false ]; then
	echo "DRY RUN: The following test commands would run:"
	echo "  $CMD_SERVER_TEST"
	echo "  $CMD_CLIENT_VITEST"
	echo "  $CMD_CLIENT_E2E"
	echo "Run with --execute to run tests."
	exit 0
fi

echo "Running server Go tests: $CMD_SERVER_TEST"
eval "$CMD_SERVER_TEST"

echo "Running client Vitest unit tests: $CMD_CLIENT_VITEST"
eval "$CMD_CLIENT_VITEST"

echo "Running client Playwright E2E tests: $CMD_CLIENT_E2E"
eval "$CMD_CLIENT_E2E"

echo "All test suites finished successfully."
