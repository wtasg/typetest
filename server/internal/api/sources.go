package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type sourceRow struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Filename    string    `json:"filename"`
	Extension   string    `json:"extension"`
	Size        int64     `json:"size"`
	ContentHash string    `json:"contentHash"`
	Content     string    `json:"content,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

func sourcesHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			listSources(w, db)
		case http.MethodPost:
			createSource(w, r, db)
		default:
			methodNotAllowed(w)
		}
	})
}

func sourceByIDHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/sources/")
		switch r.Method {
		case http.MethodGet:
			getSource(w, db, id)
		case http.MethodDelete:
			deleteSourceByID(w, db, id)
		default:
			methodNotAllowed(w)
		}
	})
}

func listSources(w http.ResponseWriter, db *sql.DB) {
	if db == nil {
		writeJSON(w, http.StatusOK, []sourceRow{})
		return
	}
	rows, err := db.Query(`SELECT id,name,filename,extension,size,content_hash,created_at FROM sources ORDER BY created_at DESC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var out []sourceRow
	for rows.Next() {
		var s sourceRow
		rows.Scan(&s.ID, &s.Name, &s.Filename, &s.Extension, &s.Size, &s.ContentHash, &s.CreatedAt) //nolint
		out = append(out, s)
	}
	if out == nil {
		out = []sourceRow{}
	}
	writeJSON(w, http.StatusOK, out)
}

func createSource(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var s sourceRow
	if err := readJSON(w, r, &s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if db == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	_, err := db.Exec(`
		INSERT INTO sources (id,name,filename,extension,size,content_hash,content)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (id) DO NOTHING`,
		s.ID, s.Name, s.Filename, s.Extension, s.Size, s.ContentHash, s.Content,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func getSource(w http.ResponseWriter, db *sql.DB, id string) {
	if db == nil {
		http.NotFound(w, nil)
		return
	}
	var s sourceRow
	err := db.QueryRow(`SELECT id,name,filename,extension,size,content_hash,content,created_at FROM sources WHERE id=$1`, id).
		Scan(&s.ID, &s.Name, &s.Filename, &s.Extension, &s.Size, &s.ContentHash, &s.Content, &s.CreatedAt)
	if err == sql.ErrNoRows {
		http.NotFound(w, nil)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func deleteSourceByID(w http.ResponseWriter, db *sql.DB, id string) {
	if db == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	db.Exec(`DELETE FROM sources WHERE id=$1`, id) //nolint
	w.WriteHeader(http.StatusNoContent)
}

// silence unused import for json in this file
var _ = json.Marshal
