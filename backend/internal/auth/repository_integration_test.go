package auth

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/your-org/uptime-app-backend/internal/platform"
)

func TestGormAuthFlowSupportsMultipleSessionsAndSingleUseRefresh(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	if err := platform.RunMigrations(databaseURL, "../../migrations"); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}
	db, err := platform.OpenPostgres(databaseURL)
	if err != nil {
		t.Fatalf("OpenPostgres() error = %v", err)
	}

	ctx := context.Background()
	if err := db.Exec("DELETE FROM refresh_sessions").Error; err != nil {
		t.Fatalf("clear refresh sessions: %v", err)
	}
	if err := db.Exec("DELETE FROM users").Error; err != nil {
		t.Fatalf("clear users: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Exec("DELETE FROM refresh_sessions").Error
		_ = db.Exec("DELETE FROM users").Error
	})

	service := NewService(
		NewGormUserRepository(db),
		NewGormSessionRepository(db),
		NewTokenManager([]byte("12345678901234567890123456789012"), 24*time.Hour),
		30*24*time.Hour,
	)
	service.now = func() time.Time { return time.Now().UTC() }

	registered, err := service.Register(ctx, RegisterInput{Email: "integration@example.com", Name: "Integration User", Password: "password1"})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if _, err := service.Login(ctx, LoginInput{Email: "integration@example.com", Password: "password1"}); err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	var sessionCount int64
	if err := db.Model(&RefreshSession{}).Count(&sessionCount).Error; err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if sessionCount != 2 {
		t.Fatalf("sessions = %d, want 2", sessionCount)
	}

	rotated, err := service.Refresh(ctx, registered.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if _, err := service.Refresh(ctx, registered.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("reused Refresh() error = %v, want ErrInvalidSession", err)
	}
	if err := service.Logout(ctx, rotated.RefreshToken); err != nil {
		t.Fatalf("Logout() error = %v", err)
	}
	if _, err := service.Refresh(ctx, rotated.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("Refresh() after logout error = %v, want ErrInvalidSession", err)
	}
}
