#!/usr/bin/env bash
# Start server and client dev servers (requires Go and npm)

# start server
(cd server && go run ./cmd/server) &
# start client
(cd client && npm run dev)
