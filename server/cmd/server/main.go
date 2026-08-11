package main

import (
	"embed"
	"fmt"
	"log"
	"net/http"

	"github.com/wtasg/typetest/server/internal/api"
	"github.com/wtasg/typetest/server/internal/database"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

const (
	addr = ":30001"
	dsn  = "host=localhost port=5432 dbname=typetest user=typetest1user password=typetest1password sslmode=disable"
)

func main() {
	db, err := database.Open(dsn)
	if err != nil {
		log.Printf("[db] unavailable: %v — running without persistence", err)
	}

	if db != nil {
		files, _ := migrationFiles.ReadDir("migrations")
		var sqls [][]byte
		for _, f := range files {
			data, _ := migrationFiles.ReadFile("migrations/" + f.Name())
			sqls = append(sqls, data)
		}
		if err := database.Migrate(db, sqls); err != nil {
			log.Printf("[db] migration warning: %v", err)
		}
	}

	mux := http.NewServeMux()
	api.Register(mux, db)

	fmt.Printf("Server listening on %s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
