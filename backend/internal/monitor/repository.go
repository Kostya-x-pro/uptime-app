package monitor

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

type GormRepository struct{ db *gorm.DB }

func NewGormRepository(db *gorm.DB) *GormRepository { return &GormRepository{db: db} }

func (r *GormRepository) Create(ctx context.Context, monitor Monitor, check Check) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&monitor).Error; err != nil {
			return err
		}
		return tx.Create(&check).Error
	})
}

func (r *GormRepository) Update(ctx context.Context, userID, monitorID, address string, intervalSeconds int64) (Monitor, error) {
	var monitor Monitor
	query := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", monitorID, userID).First(&monitor)
	if errors.Is(query.Error, gorm.ErrRecordNotFound) {
		return Monitor{}, ErrNotFound
	}
	if query.Error != nil {
		return Monitor{}, query.Error
	}
	monitor.URL = address
	monitor.IntervalSeconds = intervalSeconds
	if err := r.db.WithContext(ctx).Save(&monitor).Error; err != nil {
		return Monitor{}, err
	}
	var checks []Check
	if err := r.db.WithContext(ctx).Where("monitor_id = ?", monitor.ID).Order("checked_at DESC").Limit(20).Find(&checks).Error; err != nil {
		return Monitor{}, err
	}
	monitor.Checks = checks
	return monitor, nil
}

func (r *GormRepository) ListByUserID(ctx context.Context, userID string) ([]Monitor, error) {
	var monitors []Monitor
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&monitors).Error; err != nil {
		return nil, err
	}
	for index := range monitors {
		var checks []Check
		if err := r.db.WithContext(ctx).Where("monitor_id = ?", monitors[index].ID).Order("checked_at DESC").Limit(20).Find(&checks).Error; err != nil {
			return nil, err
		}
		monitors[index].Checks = checks
	}
	return monitors, nil
}
