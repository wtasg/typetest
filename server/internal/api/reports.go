package api

import (
	"database/sql"
	"net/http"
	"time"
)

type aggregateReport struct {
	RunCount    int     `json:"runCount"`
	AvgWPM      float64 `json:"avgEffectiveWPM"`
	BestWPM     float64 `json:"bestEffectiveWPM"`
	AvgAccuracy float64 `json:"avgAccuracy"`
}

func reportHandler(db *sql.DB, kind string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		if db == nil {
			writeJSON(w, http.StatusOK, aggregateReport{})
			return
		}

		var since *time.Time
		now := time.Now()
		switch kind {
		case "7-days":
			t := now.AddDate(0, 0, -7)
			since = &t
		case "30-days":
			t := now.AddDate(0, 0, -30)
			since = &t
		case "previous", "previous-previous":
			limit := 1
			if kind == "previous-previous" {
				limit = 2
			}
			rows, err := db.Query(`
				SELECT id,started_at,duration_ms,status,game_type,
				       effective_metrics->>'effectiveWPM', effective_metrics->>'accuracy'
				FROM typing_runs ORDER BY started_at DESC LIMIT $1`, limit)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			var out []map[string]any
			for rows.Next() {
				var id, startedAt, status, gameType string
				var durMs int64
				var wpm, acc *float64
				rows.Scan(&id, &startedAt, &durMs, &status, &gameType, &wpm, &acc) //nolint
				out = append(out, map[string]any{
					"id": id, "startedAt": startedAt, "durationMs": durMs,
					"status": status, "gameType": gameType,
					"effectiveWPM": wpm, "accuracy": acc,
				})
			}
			if out == nil {
				out = []map[string]any{}
			}
			if kind == "previous-previous" && len(out) == 2 {
				writeJSON(w, http.StatusOK, out[1])
			} else if len(out) > 0 {
				writeJSON(w, http.StatusOK, out[0])
			} else {
				writeJSON(w, http.StatusOK, nil)
			}
			return
		}

		var query string
		var args []any
		if since != nil {
			query = `
				SELECT COUNT(*),
				       COALESCE(AVG((effective_metrics->>'effectiveWPM')::float),0),
				       COALESCE(MAX((effective_metrics->>'effectiveWPM')::float),0),
				       COALESCE(AVG((effective_metrics->>'accuracy')::float),0)
				FROM typing_runs WHERE started_at > $1`
			args = []any{since}
		} else {
			query = `
				SELECT COUNT(*),
				       COALESCE(AVG((effective_metrics->>'effectiveWPM')::float),0),
				       COALESCE(MAX((effective_metrics->>'effectiveWPM')::float),0),
				       COALESCE(AVG((effective_metrics->>'accuracy')::float),0)
				FROM typing_runs`
		}

		var rep aggregateReport
		db.QueryRow(query, args...).Scan(&rep.RunCount, &rep.AvgWPM, &rep.BestWPM, &rep.AvgAccuracy) //nolint
		writeJSON(w, http.StatusOK, rep)
	})
}
