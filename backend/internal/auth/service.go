package auth

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidInput = errors.New("invalid input")
var ErrEmailAlreadyRegistered = errors.New("email already registered")
var ErrInvalidCredentials = errors.New("invalid credentials")

type Service struct {
	users      UserRepository
	sessions   SessionRepository
	tokens     TokenManager
	refreshTTL time.Duration
	now        func() time.Time
}

func NewService(users UserRepository, sessions SessionRepository, tokens TokenManager, refreshTTL time.Duration) *Service {
	return &Service{users: users, sessions: sessions, tokens: tokens, refreshTTL: refreshTTL, now: time.Now}
}

type RegisterInput struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateProfileInput struct {
	Name string `json:"name"`
}

type Profile struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	RefreshUntil time.Time
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (TokenPair, error) {
	email, name, err := validateRegistration(input)
	if err != nil {
		return TokenPair{}, err
	}
	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return TokenPair{}, ErrEmailAlreadyRegistered
	} else if !errors.Is(err, ErrNotFound) {
		return TokenPair{}, fmt.Errorf("find user: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return TokenPair{}, fmt.Errorf("hash password: %w", err)
	}
	userID, err := NewID()
	if err != nil {
		return TokenPair{}, err
	}
	now := s.now().UTC()
	user := User{ID: userID, Email: email, Name: name, PasswordHash: string(hash), CreatedAt: now, UpdatedAt: now}
	if err := s.users.Create(ctx, user); err != nil {
		if errors.Is(err, ErrEmailAlreadyRegistered) {
			return TokenPair{}, ErrEmailAlreadyRegistered
		}
		return TokenPair{}, fmt.Errorf("create user: %w", err)
	}
	return s.createSession(ctx, user.ID, now)
}

func (s *Service) Login(ctx context.Context, input LoginInput) (TokenPair, error) {
	email := normalizeEmail(input.Email)
	if email == "" || input.Password == "" {
		return TokenPair{}, ErrInvalidCredentials
	}
	user, err := s.users.FindByEmail(ctx, email)
	if errors.Is(err, ErrNotFound) {
		return TokenPair{}, ErrInvalidCredentials
	}
	if err != nil {
		return TokenPair{}, fmt.Errorf("find user: %w", err)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)) != nil {
		return TokenPair{}, ErrInvalidCredentials
	}
	return s.createSession(ctx, user.ID, s.now().UTC())
}

func (s *Service) Refresh(ctx context.Context, rawToken string) (TokenPair, error) {
	if rawToken == "" {
		return TokenPair{}, ErrInvalidSession
	}
	now := s.now().UTC()
	refreshToken, err := NewRefreshToken()
	if err != nil {
		return TokenPair{}, err
	}
	sessionID, err := NewID()
	if err != nil {
		return TokenPair{}, err
	}
	replacement := RefreshSession{
		ID:        sessionID,
		TokenHash: HashRefreshToken(refreshToken),
		ExpiresAt: now.Add(s.refreshTTL),
		CreatedAt: now,
	}
	previous, err := s.sessions.Rotate(ctx, HashRefreshToken(rawToken), replacement, now)
	if err != nil {
		return TokenPair{}, err
	}
	accessToken, err := s.tokens.NewAccessToken(previous.UserID, now)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken, RefreshUntil: replacement.ExpiresAt}, nil
}

func (s *Service) Logout(ctx context.Context, rawToken string) error {
	if rawToken == "" {
		return nil
	}
	return s.sessions.RevokeByHash(ctx, HashRefreshToken(rawToken), s.now().UTC())
}

func (s *Service) Profile(ctx context.Context, userID string) (Profile, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}
	return Profile{ID: user.ID, Email: user.Email, Name: user.Name, AvatarURL: user.AvatarURL}, nil
}

func (s *Service) UpdateAvatarURL(ctx context.Context, userID, avatarURL string) (Profile, error) {
	if avatarURL == "" {
		return Profile{}, ErrInvalidInput
	}
	if err := s.users.UpdateAvatarURL(ctx, userID, avatarURL); err != nil {
		return Profile{}, err
	}
	return s.Profile(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (Profile, error) {
	name, err := validateName(input.Name)
	if err != nil {
		return Profile{}, err
	}
	if err := s.users.UpdateName(ctx, userID, name); err != nil {
		return Profile{}, err
	}
	return s.Profile(ctx, userID)
}

func (s *Service) createSession(ctx context.Context, userID string, now time.Time) (TokenPair, error) {
	refreshToken, err := NewRefreshToken()
	if err != nil {
		return TokenPair{}, err
	}
	sessionID, err := NewID()
	if err != nil {
		return TokenPair{}, err
	}
	expiresAt := now.Add(s.refreshTTL)
	if err := s.sessions.Create(ctx, RefreshSession{
		ID: sessionID, UserID: userID, TokenHash: HashRefreshToken(refreshToken), ExpiresAt: expiresAt, CreatedAt: now,
	}); err != nil {
		return TokenPair{}, fmt.Errorf("create refresh session: %w", err)
	}
	accessToken, err := s.tokens.NewAccessToken(userID, now)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken, RefreshUntil: expiresAt}, nil
}

func validateRegistration(input RegisterInput) (string, string, error) {
	email := normalizeEmail(input.Email)
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email {
		return "", "", ErrInvalidInput
	}
	name, err := validateName(input.Name)
	if err != nil {
		return "", "", err
	}
	if utf8.RuneCountInString(input.Password) < 8 {
		return "", "", ErrInvalidInput
	}
	return email, name, nil
}

func validateName(value string) (string, error) {
	name := strings.TrimSpace(value)
	if length := utf8.RuneCountInString(name); length < 2 || length > 100 {
		return "", ErrInvalidInput
	}
	return name, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
