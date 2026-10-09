package main

import (
	"errors"
	"log"
	"net/http"

	_ "github.com/your-org/uptime-app-backend/docs"
	"github.com/your-org/uptime-app-backend/internal/app"
	"github.com/your-org/uptime-app-backend/internal/config"
)

// @title Uptime App API
// @version 1.0
// @description API for user authentication, profile management and uptime monitoring.
// @host localhost:8080
// @BasePath /
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter the token with the `Bearer ` prefix.

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	if err := app.Run(cfg); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
