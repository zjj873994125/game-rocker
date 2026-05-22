package main

import (
	"log"

	"zjj-virtual-arcade-controller/server/internal/app"
	"zjj-virtual-arcade-controller/server/internal/config"
)

func main() {
	cfg := config.Load()
	server := app.NewServer(cfg)

	log.Printf("level editor map server listening on %s, data dir: %s", cfg.HTTP.Addr, cfg.Storage.MapDataDir)
	if err := server.ListenAndServe(); err != nil && !app.IsExpectedShutdown(err) {
		log.Fatal(err)
	}
}
