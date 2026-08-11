package api

import (
	"database/sql"
	"net/http"
)

// cors adds permissive CORS headers for the SolidJS dev client on :30002.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
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
