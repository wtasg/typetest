package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

// Open connects to PostgreSQL. Returns (nil, err) if unreachable; callers must tolerate a nil DB.
func Open(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	log.Println("[db] connected")
	return db, nil
}

// Migrate applies all SQL migration files (passed in order by the caller).
func Migrate(db *sql.DB, sqlFiles [][]byte) error {
	for _, data := range sqlFiles {
		if _, err := db.Exec(string(data)); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}
	return nil
}
