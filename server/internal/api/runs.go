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
	Target           string          `json:"target"`
	Events           json.RawMessage `json:"events"`
	Metrics          json.RawMessage `json:"metrics"`
	RawMetrics       json.RawMessage `json:"-"`
	EffectiveMetrics json.RawMessage `json:"-"`
}

func createRun(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var body map[string]json.RawMessage
	if err := readJSON(r, &body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if db == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	id := strings.Trim(string(body["id"]), `"`)
	startedAt := strings.Trim(string(body["startedAt"]), `"`)
	durationMs := int64(0)
	json.Unmarshal(body["durationMs"], &durationMs) //nolint
	status := strings.Trim(string(body["status"]), `"`)

	var cfg struct {
		GameType string `json:"gameType"`
	}
	json.Unmarshal(body["configuration"], &cfg) //nolint

	var src struct {
		ID string `json:"id"`
	}
	json.Unmarshal(body["source"], &src) //nolint

	target := strings.Trim(string(body["target"]), `"`)

	var metrics map[string]json.RawMessage
	json.Unmarshal(body["metrics"], &metrics) //nolint
	rawM, _ := json.Marshal(metrics["raw"])
	effM, _ := json.Marshal(metrics["effective"])

	events := body["events"]
	if len(events) == 0 {
		events = json.RawMessage("[]")
	}

	var sourceID *string
	if src.ID != "" {
		sourceID = &src.ID
	}

	_, err := db.Exec(`
		INSERT INTO typing_runs
		  (id,source_id,started_at,duration_ms,status,game_type,configuration,
		   target,events,raw_metrics,effective_metrics)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO NOTHING`,
		id, sourceID, startedAt, durationMs, status, cfg.GameType,
		body["configuration"], target, events, rawM, effM,
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
