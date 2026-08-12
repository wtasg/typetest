package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

func healthHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "unavailable"
		if db != nil {
			if err := db.Ping(); err == nil {
				dbStatus = "connected"
			}
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "db": dbStatus})
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func readJSON(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20) // 5MB body limit to prevent OOM DoS
	return json.NewDecoder(r.Body).Decode(v)
}

func methodNotAllowed(w http.ResponseWriter) {
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}
