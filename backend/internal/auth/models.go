package auth

import "time"

type User struct {
	ID           string    `gorm:"type:uuid;primaryKey"`
	Email        string    `gorm:"size:320;not null;uniqueIndex"`
	Name         string    `gorm:"size:100;not null"`
	AvatarURL    string    `gorm:"size:255;not null;default:''"`
	PasswordHash string    `gorm:"not null"`
	CreatedAt    time.Time `gorm:"not null"`
	UpdatedAt    time.Time `gorm:"not null"`
}

func (User) TableName() string { return "users" }

type RefreshSession struct {
	ID        string     `gorm:"type:uuid;primaryKey"`
	UserID    string     `gorm:"type:uuid;not null;index"`
	TokenHash string     `gorm:"size:64;not null;uniqueIndex"`
	ExpiresAt time.Time  `gorm:"not null;index"`
	CreatedAt time.Time  `gorm:"not null"`
	RevokedAt *time.Time `gorm:"index"`
}

func (RefreshSession) TableName() string { return "refresh_sessions" }
