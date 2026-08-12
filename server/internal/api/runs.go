package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type runRow struct {
	ID               string          `json:"id"`
	SourceID         *string         `json:"sourceId,omitempty"`
	StartedAt        time.Time       `json:"startedAt"`
	DurationMs       int64           `json:"durationMs"`
	Status           string          `json:"status"`
	GameType         string          `json:"gameType"`
	Configuration    json.RawMessage `json:"configuration"`
	Target           string          `json:"target"`
	Events           json.RawMessage `json:"events"`
	RawMetrics       json.RawMessage `json:"rawMetrics"`
	EffectiveMetrics json.RawMessage `json:"effectiveMetrics"`
}

func runsHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			listRuns(w, db)
		case http.MethodPost:
			createRun(w, r, db)
		default:
			methodNotAllowed(w)
		}
	})
}

func runByIDHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/runs/")
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		getRun(w, db, id)
	})
}

func listRuns(w http.ResponseWriter, db *sql.DB) {
	if db == nil {
		writeJSON(w, http.StatusOK, []runRow{})
		return
	}
	rows, err := db.Query(`
		SELECT id,source_id,started_at,duration_ms,status,game_type,
		       configuration,target,events,raw_metrics,effective_metrics
		FROM typing_runs ORDER BY started_at DESC LIMIT 200`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var out []runRow
	for rows.Next() {
		var r runRow
		rows.Scan(&r.ID, &r.SourceID, &r.StartedAt, &r.DurationMs, &r.Status, &r.GameType,
			&r.Configuration, &r.Target, &r.Events, &r.RawMetrics, &r.EffectiveMetrics) //nolint
		out = append(out, r)
	}
	if out == nil {
		out = []runRow{}
	}
	writeJSON(w, http.StatusOK, out)
}

// incomingRun mirrors the client CompletedRun shape.
type incomingRun struct {
	ID            string          `json:"id"`
	StartedAt     string          `json:"startedAt"`
	DurationMs    int64           `json:"durationMs"`
	Status        string          `json:"status"`
	Configuration json.RawMessage `json:"configuration"`
	Source        struct {
		ID string `json:"id"`
	} `json:"source"`
	Target  string          `json:"target"`
	Events  json.RawMessage `json:"events"`
	Metrics struct {
		Raw       json.RawMessage `json:"raw"`
		Effective json.RawMessage `json:"effective"`
	} `json:"metrics"`
}

func createRun(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var payload incomingRun
	if err := readJSON(w, r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if db == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var cfg struct {
		GameType string `json:"gameType"`
	}
	json.Unmarshal(payload.Configuration, &cfg) //nolint

	rawM, _ := json.Marshal(payload.Metrics.Raw)
	effM, _ := json.Marshal(payload.Metrics.Effective)

	events := payload.Events
	if len(events) == 0 {
		events = json.RawMessage("[]")
	}

	var sourceID *string
	if payload.Source.ID != "" {
		sourceID = &payload.Source.ID
	}

	_, err := db.Exec(`
		INSERT INTO typing_runs
		  (id,source_id,started_at,duration_ms,status,game_type,configuration,
		   target,events,raw_metrics,effective_metrics)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO NOTHING`,
		payload.ID, sourceID, payload.StartedAt, payload.DurationMs, payload.Status, cfg.GameType,
		payload.Configuration, payload.Target, events, rawM, effM,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func getRun(w http.ResponseWriter, db *sql.DB, id string) {
	if db == nil {
		http.NotFound(w, nil)
		return
	}
	var r runRow
	err := db.QueryRow(`
		SELECT id,source_id,started_at,duration_ms,status,game_type,
		       configuration,target,events,raw_metrics,effective_metrics
		FROM typing_runs WHERE id=$1`, id).
		Scan(&r.ID, &r.SourceID, &r.StartedAt, &r.DurationMs, &r.Status, &r.GameType,
			&r.Configuration, &r.Target, &r.Events, &r.RawMetrics, &r.EffectiveMetrics)
	if err == sql.ErrNoRows {
		http.NotFound(w, nil)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, r)
}
