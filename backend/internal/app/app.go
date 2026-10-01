package app

import (
	"fmt"
	"net/http"
	"time"

	"github.com/your-org/uptime-app-backend/internal/auth"
	"github.com/your-org/uptime-app-backend/internal/config"
	"github.com/your-org/uptime-app-backend/internal/platform"
)

func NewServer(cfg config.Config) (*http.Server, error) {
	if err := platform.RunMigrations(cfg.DatabaseURL, cfg.MigrationsDir); err != nil {
		return nil, err
	}
	db, err := platform.OpenPostgres(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	users := auth.NewGormUserRepository(db)
	sessions := auth.NewGormSessionRepository(db)
	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.AccessTTL)
	service := auth.NewService(users, sessions, tokens, cfg.RefreshTTL)
	handler := auth.NewHTTPHandler(service, tokens, cfg.FrontendOrigin, cfg.CookieSecure, cfg.AvatarsDir)
	mux := http.NewServeMux()
	mux.Handle("/uploads/avatars/", http.StripPrefix("/uploads/avatars/", http.FileServer(http.Dir(cfg.AvatarsDir))))
	mux.Handle("/", handler)

	return &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}, nil
}

func Run(cfg config.Config) error {
	server, err := NewServer(cfg)
	if err != nil {
		return fmt.Errorf("create server: %w", err)
	}
	return server.ListenAndServe()
}
