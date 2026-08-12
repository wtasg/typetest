package api

import (
	"database/sql"
	"net/http"
	"os"
	"strings"
)

// cors validates request origin against ALLOWED_ORIGIN (defaulting to localhost origins).
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")

		if origin != "" {
			if allowedOrigin != "" {
				if origin == allowedOrigin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			} else {
				// Default behavior: allow localhost origins only (e.g. http://localhost:30002, http://127.0.0.1:30002)
				if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") || strings.HasPrefix(origin, "http://[::1]:") {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Register mounts all API routes on mux.
func Register(mux *http.ServeMux, db *sql.DB) {
	mux.Handle("/api/health", cors(healthHandler(db)))
	mux.Handle("/api/sources", cors(sourcesHandler(db)))
	mux.Handle("/api/sources/", cors(sourceByIDHandler(db)))
	mux.Handle("/api/runs", cors(runsHandler(db)))
	mux.Handle("/api/runs/", cors(runByIDHandler(db)))
	mux.Handle("/api/reports/previous", cors(reportHandler(db, "previous")))
	mux.Handle("/api/reports/previous-previous", cors(reportHandler(db, "previous-previous")))
	mux.Handle("/api/reports/7-days", cors(reportHandler(db, "7-days")))
	mux.Handle("/api/reports/30-days", cors(reportHandler(db, "30-days")))
	mux.Handle("/api/reports/all-time", cors(reportHandler(db, "all-time")))
}
