package monitor

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

type GormRepository struct{ db *gorm.DB }

func NewGormRepository(db *gorm.DB) *GormRepository { return &GormRepository{db: db} }

func (r *GormRepository) Create(ctx context.Context, monitor Monitor, check Check) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&Monitor{}).Where("user_id = ?", monitor.UserID).Count(&count).Error; err != nil {
			return err
		}
		if count >= MaxMonitorsPerUser {
			return ErrMonitorLimitReached
		}
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
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Limit(MaxMonitorsPerUser).Find(&monitors).Error; err != nil {
		return nil, err
	}
	if len(monitors) == 0 {
		return monitors, nil
	}
	monitorIDs := make([]string, len(monitors))
	for index := range monitors {
		monitorIDs[index] = monitors[index].ID
	}
	var checks []Check
	const checksPerMonitor = 20
	query := `SELECT id, monitor_id, status, response_time_ms, checked_at FROM (
		SELECT id, monitor_id, status, response_time_ms, checked_at,
		ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) AS row_number
		FROM monitor_checks WHERE monitor_id IN ?
	) AS ranked_checks WHERE row_number <= ? ORDER BY monitor_id, checked_at DESC`
	if err := r.db.WithContext(ctx).Raw(query, monitorIDs, checksPerMonitor).Scan(&checks).Error; err != nil {
		return nil, err
	}
	checksByMonitor := make(map[string][]Check, len(monitors))
	for _, check := range checks {
		checksByMonitor[check.MonitorID] = append(checksByMonitor[check.MonitorID], check)
	}
	for index := range monitors {
		monitors[index].Checks = checksByMonitor[monitors[index].ID]
	}
	return monitors, nil
}

func (r *GormRepository) ListDue(ctx context.Context, before time.Time, limit int) ([]Monitor, error) {
	var monitors []Monitor
	query := `last_checked_at IS NULL OR last_checked_at + (interval_seconds * INTERVAL '1 second') <= ?`
	if err := r.db.WithContext(ctx).Where(query, before).Order("last_checked_at ASC NULLS FIRST").Limit(limit).Find(&monitors).Error; err != nil {
		return nil, err
	}
	return monitors, nil
}

func (r *GormRepository) RecordCheck(ctx context.Context, monitor Monitor, check Check) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&check).Error; err != nil {
			return err
		}
		return tx.Model(&Monitor{}).Where("id = ?", monitor.ID).Updates(map[string]any{
			"status":                check.Status,
			"last_checked_at":       check.CheckedAt,
			"last_response_time_ms": check.ResponseTimeMS,
		}).Error
	})
}
