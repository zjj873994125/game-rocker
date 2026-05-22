package app

import (
	"errors"
	"log"
	"net/http"
	"time"

	"zjj-virtual-arcade-controller/server/internal/auth"
	"zjj-virtual-arcade-controller/server/internal/config"
	"zjj-virtual-arcade-controller/server/internal/database"
	httpapi "zjj-virtual-arcade-controller/server/internal/http"
	"zjj-virtual-arcade-controller/server/internal/maps"
	"zjj-virtual-arcade-controller/server/internal/repository"
)

func NewServer(cfg config.Config) *http.Server {
	var store maps.Store
	var userStore auth.UserStore

	if cfg.Database.Enabled {
		db, err := database.OpenMySQL(cfg.Database)
		if err != nil {
			log.Fatalf("connect database failed: %v", err)
		}
		log.Printf("database connected successfully: driver=%s host=%s port=%d db=%s user=%s", cfg.Database.Driver, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name, cfg.Database.User)
		store = repository.NewMapStore(db)
		userStore = repository.NewUserStore(db)
	} else {
		log.Fatal("auth requires DB_ENABLED=true because users are stored in MySQL")
	}

	tokenTTL, err := time.ParseDuration(cfg.Auth.TokenTTL)
	if err != nil {
		log.Fatalf("parse AUTH_TOKEN_TTL failed: %v", err)
	}
	authService := auth.NewService(userStore, auth.NewTokenManager(cfg.Auth.TokenSecret, tokenTTL))
	authHandler := auth.NewHandler(authService)
	requireAuth := auth.Middleware(authService)
	mapHandler := maps.NewHandler(store)

	return &http.Server{
		Addr:              cfg.HTTP.Addr,
		Handler:           httpapi.NewRouter(mapHandler, authHandler, requireAuth),
		ReadHeaderTimeout: 5 * time.Second,
	}
}

func IsExpectedShutdown(err error) bool {
	return errors.Is(err, http.ErrServerClosed)
}
