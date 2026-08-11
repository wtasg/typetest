package main

import (
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/wtasg/typetest/server/internal/api"
	"github.com/wtasg/typetest/server/internal/database"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func getDSN() string {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "typetest"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		// fail
		log.Fatal("DB_USER is not set")
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		log.Fatal("DB_PASSWORD is not set")
	}

	return fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s sslmode=disable",
		host, port, dbname, user, password)
}

func getAddr() string {
	addr := os.Getenv("SERVER_ADDR")
	if addr == "" {
		addr = ":30001"
	}
	return addr
}

func main() {
	dsn := getDSN()
	addr := getAddr()

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
