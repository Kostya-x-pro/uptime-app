package monitor

import (
	"context"
	"testing"
	"time"
)

type memoryRepository struct{ monitors []Monitor }

func (r *memoryRepository) Create(_ context.Context, monitor Monitor, check Check) error {
	monitor.Checks = []Check{check}
	r.monitors = append(r.monitors, monitor)
	return nil
}

func (r *memoryRepository) ListByUserID(_ context.Context, userID string) ([]Monitor, error) {
	var result []Monitor
	for _, monitor := range r.monitors {
		if monitor.UserID == userID {
			result = append(result, monitor)
		}
	}
	return result, nil
}

func (r *memoryRepository) Update(_ context.Context, userID, monitorID, address string, intervalSeconds int64) (Monitor, error) {
	for index, monitor := range r.monitors {
		if monitor.ID == monitorID && monitor.UserID == userID {
			monitor.URL = address
			monitor.IntervalSeconds = intervalSeconds
			r.monitors[index] = monitor
			return monitor, nil
		}
	}
	return Monitor{}, ErrNotFound
}

type fixedChecker struct{ status Status }

func (checker fixedChecker) Check(context.Context, string) (Status, *int) {
	responseTime := 42
	return checker.status, &responseTime
}

func TestCreateStoresInitialCheck(t *testing.T) {
	repository := &memoryRepository{}
	service := NewService(repository, fixedChecker{status: StatusUp})
	service.now = func() time.Time { return time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC) }

	monitor, err := service.Create(context.Background(), "user-id", " https://example.com/status ", 300)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if monitor.URL != "https://example.com/status" || monitor.Status != StatusUp || len(monitor.Checks) != 1 {
		t.Fatalf("Create() = %+v", monitor)
	}
	if len(repository.monitors) != 1 || repository.monitors[0].Checks[0].ResponseTimeMS == nil {
		t.Fatalf("stored monitors = %+v", repository.monitors)
	}
}

func TestCreateRejectsInvalidInput(t *testing.T) {
	service := NewService(&memoryRepository{}, fixedChecker{status: StatusUp})
	for _, input := range []struct {
		url      string
		interval int64
	}{
		{url: "example.com", interval: 60},
		{url: "ftp://example.com", interval: 60},
		{url: "https://example.com", interval: 0},
	} {
		if _, err := service.Create(context.Background(), "user-id", input.url, input.interval); err != ErrInvalidInput {
			t.Errorf("Create(%q, %d) error = %v, want ErrInvalidInput", input.url, input.interval, err)
		}
	}
}

func TestUpdateChangesMonitorSettings(t *testing.T) {
	repository := &memoryRepository{}
	service := NewService(repository, fixedChecker{status: StatusUp})
	created, err := service.Create(context.Background(), "user-id", "https://example.com", 60)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	updated, err := service.Update(context.Background(), "user-id", created.ID, "https://example.org", 3600)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.URL != "https://example.org" || updated.IntervalSeconds != 3600 {
		t.Fatalf("Update() = %+v", updated)
	}
}
