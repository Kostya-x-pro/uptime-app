package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

type memoryUsers struct{ users map[string]User }

func (r *memoryUsers) Create(_ context.Context, user User) error {
	if _, exists := r.users[user.Email]; exists {
		return errors.New("duplicate email")
	}
	r.users[user.Email] = user
	return nil
}

func (r *memoryUsers) FindByEmail(_ context.Context, email string) (User, error) {
	user, ok := r.users[email]
	if !ok {
		return User{}, ErrNotFound
	}
	return user, nil
}

type memorySessions struct{ sessions map[string]RefreshSession }

func (r *memorySessions) Create(_ context.Context, session RefreshSession) error {
	r.sessions[session.TokenHash] = session
	return nil
}

func (r *memorySessions) Rotate(_ context.Context, tokenHash string, replacement RefreshSession, now time.Time) (RefreshSession, error) {
	previous, ok := r.sessions[tokenHash]
	if !ok || previous.RevokedAt != nil || !previous.ExpiresAt.After(now) {
		return RefreshSession{}, ErrInvalidSession
	}
	previous.RevokedAt = &now
	r.sessions[tokenHash] = previous
	replacement.UserID = previous.UserID
	r.sessions[replacement.TokenHash] = replacement
	return previous, nil
}

func (r *memorySessions) RevokeByHash(_ context.Context, tokenHash string, now time.Time) error {
	if session, ok := r.sessions[tokenHash]; ok && session.RevokedAt == nil {
		session.RevokedAt = &now
		r.sessions[tokenHash] = session
	}
	return nil
}

func newTestService() (*Service, *memorySessions) {
	sessions := &memorySessions{sessions: make(map[string]RefreshSession)}
	service := NewService(&memoryUsers{users: make(map[string]User)}, sessions, NewTokenManager([]byte("12345678901234567890123456789012"), 24*time.Hour), 30*24*time.Hour)
	service.now = func() time.Time { return time.Date(2026, 9, 28, 12, 0, 0, 0, time.UTC) }
	return service, sessions
}

func TestRegisterNormalizesEmailAndCreatesSession(t *testing.T) {
	service, sessions := newTestService()
	pair, err := service.Register(context.Background(), RegisterInput{Email: "  USER@Example.COM ", Name: "User Name", Password: "password1"})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatal("Register() did not issue both tokens")
	}
	if len(sessions.sessions) != 1 {
		t.Fatalf("created sessions = %d, want 1", len(sessions.sessions))
	}
}

func TestRegisterRejectsInvalidData(t *testing.T) {
	service, _ := newTestService()
	for _, input := range []RegisterInput{
		{Email: "invalid", Name: "User", Password: "password1"},
		{Email: "user@example.com", Name: "U", Password: "password1"},
		{Email: "user@example.com", Name: "User", Password: "short"},
	} {
		if _, err := service.Register(context.Background(), input); !errors.Is(err, ErrInvalidInput) {
			t.Errorf("Register(%+v) error = %v, want ErrInvalidInput", input, err)
		}
	}
}

func TestRefreshRotatesToken(t *testing.T) {
	service, sessions := newTestService()
	pair, err := service.Register(context.Background(), RegisterInput{Email: "user@example.com", Name: "User", Password: "password1"})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	rotated, err := service.Refresh(context.Background(), pair.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if rotated.RefreshToken == pair.RefreshToken {
		t.Fatal("Refresh() returned the prior refresh token")
	}
	if _, err := service.Refresh(context.Background(), pair.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("reused refresh error = %v, want ErrInvalidSession", err)
	}
	if len(sessions.sessions) != 2 {
		t.Fatalf("sessions = %d, want 2", len(sessions.sessions))
	}
}

func TestTokenManagerRejectsWrongTokenType(t *testing.T) {
	manager := NewTokenManager([]byte("12345678901234567890123456789012"), time.Hour)
	token, err := manager.NewAccessToken("user-id", time.Now())
	if err != nil {
		t.Fatalf("NewAccessToken() error = %v", err)
	}
	userID, err := manager.ParseAccessToken(token)
	if err != nil || userID != "user-id" {
		t.Fatalf("ParseAccessToken() = %q, %v", userID, err)
	}
}
