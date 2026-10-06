package app

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/your-org/uptime-app-backend/internal/auth"
	"github.com/your-org/uptime-app-backend/internal/config"
	"github.com/your-org/uptime-app-backend/internal/monitor"
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
	monitors := monitor.NewService(monitor.NewGormRepository(db), monitor.NewHTTPChecker())
	authHandler := auth.NewHTTPHandler(
		service,
		tokens,
		cfg.CookieSecure,
		platform.NewFileStorage(cfg.UploadsDir),
		platform.NewFileStorageAt(filepath.Join(cfg.UploadsDir, "avatars"), "/uploads/avatars"),
	)
	mux := http.NewServeMux()
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", uploadsHandler(cfg.UploadsDir)))
	monitorHandler := auth.RequireAccessToken(tokens, monitor.NewHTTPHandler(monitors))
	mux.Handle("/api/v1/monitors", monitorHandler)
	mux.Handle("/api/v1/monitors/", monitorHandler)
	mux.Handle("/", authHandler)
	checkerContext, stopChecker := context.WithCancel(context.Background())
	go monitors.RunScheduler(checkerContext)

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           auth.CORS(cfg.FrontendOrigin, mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	server.RegisterOnShutdown(stopChecker)
	return server, nil
}

func uploadsHandler(directory string) http.Handler {
	files := http.FileServer(http.Dir(directory))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if !strings.HasPrefix(strings.TrimPrefix(r.URL.Path, "/"), "avatars/") {
			w.Header().Set("Content-Disposition", "attachment")
		}
		files.ServeHTTP(w, r)
	})
}

func Run(cfg config.Config) error {
	server, err := NewServer(cfg)
	if err != nil {
		return fmt.Errorf("create server: %w", err)
	}
	return server.ListenAndServe()
}
