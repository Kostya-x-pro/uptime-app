package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrNotFound = errors.New("record not found")
var ErrInvalidSession = errors.New("invalid refresh session")

type UserRepository interface {
	Create(context.Context, User) error
	FindByEmail(context.Context, string) (User, error)
	FindByID(context.Context, string) (User, error)
	UpdateName(context.Context, string, string) error
	UpdateAvatarURL(context.Context, string, string) error
}

type SessionRepository interface {
	Create(context.Context, RefreshSession) error
	Rotate(context.Context, string, RefreshSession, time.Time) (RefreshSession, error)
	RevokeByHash(context.Context, string, time.Time) error
}

type GormUserRepository struct{ db *gorm.DB }

func NewGormUserRepository(db *gorm.DB) *GormUserRepository { return &GormUserRepository{db: db} }

func (r *GormUserRepository) Create(ctx context.Context, user User) error {
	err := r.db.WithContext(ctx).Create(&user).Error
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) && pgError.Code == "23505" && pgError.ConstraintName == "users_email_key" {
		return ErrEmailAlreadyRegistered
	}
	return err
}

func (r *GormUserRepository) FindByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (r *GormUserRepository) FindByID(ctx context.Context, userID string) (User, error) {
	var user User
	err := r.db.WithContext(ctx).First(&user, "id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (r *GormUserRepository) UpdateName(ctx context.Context, userID, name string) error {
	result := r.db.WithContext(ctx).Model(&User{}).Where("id = ?", userID).Update("name", name)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *GormUserRepository) UpdateAvatarURL(ctx context.Context, userID, avatarURL string) error {
	result := r.db.WithContext(ctx).Model(&User{}).Where("id = ?", userID).Update("avatar_url", avatarURL)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

type GormSessionRepository struct{ db *gorm.DB }

func NewGormSessionRepository(db *gorm.DB) *GormSessionRepository {
	return &GormSessionRepository{db: db}
}

func (r *GormSessionRepository) Create(ctx context.Context, session RefreshSession) error {
	return r.db.WithContext(ctx).Create(&session).Error
}

func (r *GormSessionRepository) Rotate(ctx context.Context, tokenHash string, replacement RefreshSession, now time.Time) (RefreshSession, error) {
	var previous RefreshSession
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("token_hash = ?", tokenHash).First(&previous)
		if errors.Is(query.Error, gorm.ErrRecordNotFound) {
			return ErrInvalidSession
		}
		if query.Error != nil {
			return query.Error
		}
		if previous.RevokedAt != nil || !previous.ExpiresAt.After(now) {
			return ErrInvalidSession
		}

		updated := tx.Model(&RefreshSession{}).Where("id = ? AND revoked_at IS NULL", previous.ID).Update("revoked_at", now)
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected != 1 {
			return ErrInvalidSession
		}
		replacement.UserID = previous.UserID
		return tx.Create(&replacement).Error
	})
	if err != nil {
		return RefreshSession{}, err
	}
	return previous, nil
}

func (r *GormSessionRepository) RevokeByHash(ctx context.Context, tokenHash string, now time.Time) error {
	return r.db.WithContext(ctx).Model(&RefreshSession{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", now).Error
}
