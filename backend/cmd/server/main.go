package main

import (
	"errors"
	"log"
	"net/http"

	"github.com/your-org/uptime-app-backend/internal/app"
	"github.com/your-org/uptime-app-backend/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	if err := app.Run(cfg); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
