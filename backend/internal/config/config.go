package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL    string
	JWTSecret      []byte
	FrontendOrigin string
	CookieSecure   bool
	HTTPAddr       string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
	MigrationsDir  string
	AvatarsDir     string
}

func Load() (Config, error) {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return Config{}, errors.New("JWT_SECRET must contain at least 32 characters")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	cookieSecure, err := boolEnv("COOKIE_SECURE", false)
	if err != nil {
		return Config{}, err
	}

	accessTTL, err := durationEnv("ACCESS_TOKEN_TTL", 24*time.Hour)
	if err != nil {
		return Config{}, err
	}
	refreshTTL, err := durationEnv("REFRESH_TOKEN_TTL", 30*24*time.Hour)
	if err != nil {
		return Config{}, err
	}
	if accessTTL <= 0 || refreshTTL <= 0 {
		return Config{}, errors.New("token TTL values must be positive")
	}

	return Config{
		DatabaseURL:    databaseURL,
		JWTSecret:      []byte(secret),
		FrontendOrigin: strings.TrimRight(os.Getenv("FRONTEND_ORIGIN"), "/"),
		CookieSecure:   cookieSecure,
		HTTPAddr:       valueOr("HTTP_ADDR", ":8080"),
		AccessTTL:      accessTTL,
		RefreshTTL:     refreshTTL,
		MigrationsDir:  valueOr("MIGRATIONS_DIR", "migrations"),
		AvatarsDir:     valueOr("AVATARS_DIR", "uploads/avatars"),
	}, nil
}

func valueOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func boolEnv(key string, fallback bool) (bool, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s must be a boolean: %w", key, err)
	}
	return parsed, nil
}

func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be a Go duration: %w", key, err)
	}
	return parsed, nil
}
