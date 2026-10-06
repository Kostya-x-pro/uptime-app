package monitor

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

var ErrInvalidInput = errors.New("invalid monitor input")
var ErrNotFound = errors.New("monitor not found")
var ErrMonitorLimitReached = errors.New("monitor limit reached")

type Repository interface {
	Create(context.Context, Monitor, Check) error
	ListByUserID(context.Context, string) ([]Monitor, error)
	Update(context.Context, string, string, string, int64) (Monitor, error)
	ListDue(context.Context, time.Time, int) ([]Monitor, error)
	RecordCheck(context.Context, Monitor, Check) error
}

const schedulerInterval = 10 * time.Second
const schedulerBatchSize = 50

type Checker interface {
	Check(context.Context, string) (Status, *int)
}

type Service struct {
	repository Repository
	checker    Checker
	now        func() time.Time
}

func NewService(repository Repository, checker Checker) *Service {
	return &Service{repository: repository, checker: checker, now: time.Now}
}

func (s *Service) Create(ctx context.Context, userID, rawURL string, intervalSeconds int64) (Monitor, error) {
	address, err := validateInput(rawURL, intervalSeconds)
	if err != nil {
		return Monitor{}, err
	}
	id, err := newID()
	if err != nil {
		return Monitor{}, err
	}
	now := s.now().UTC()
	status, responseTimeMS := s.checker.Check(ctx, address)
	monitor := Monitor{
		ID: id, UserID: userID, URL: address, IntervalSeconds: intervalSeconds, Status: status,
		LastCheckedAt: &now, LastResponseTimeMS: responseTimeMS, CreatedAt: now, UpdatedAt: now,
	}
	checkID, err := newID()
	if err != nil {
		return Monitor{}, err
	}
	check := Check{ID: checkID, MonitorID: id, Status: status, ResponseTimeMS: responseTimeMS, CheckedAt: now}
	if err := s.repository.Create(ctx, monitor, check); err != nil {
		return Monitor{}, fmt.Errorf("create monitor: %w", err)
	}
	monitor.Checks = []Check{check}
	return monitor, nil
}

func (s *Service) List(ctx context.Context, userID string) ([]Monitor, error) {
	return s.repository.ListByUserID(ctx, userID)
}

func (s *Service) RunScheduler(ctx context.Context) {
	s.checkDue(ctx)
	ticker := time.NewTicker(schedulerInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.checkDue(ctx)
		}
	}
}

func (s *Service) checkDue(ctx context.Context) {
	monitors, err := s.repository.ListDue(ctx, s.now().UTC(), schedulerBatchSize)
	if err != nil {
		return
	}
	for _, item := range monitors {
		if ctx.Err() != nil {
			return
		}
		checkedAt := s.now().UTC()
		status, responseTimeMS := s.checker.Check(ctx, item.URL)
		checkID, err := newID()
		if err != nil {
			continue
		}
		check := Check{ID: checkID, MonitorID: item.ID, Status: status, ResponseTimeMS: responseTimeMS, CheckedAt: checkedAt}
		_ = s.repository.RecordCheck(ctx, item, check)
	}
}

func (s *Service) Update(ctx context.Context, userID, monitorID, rawURL string, intervalSeconds int64) (Monitor, error) {
	address, err := validateInput(rawURL, intervalSeconds)
	if err != nil {
		return Monitor{}, err
	}
	updated, err := s.repository.Update(ctx, userID, monitorID, address, intervalSeconds)
	if err != nil {
		return Monitor{}, err
	}
	return updated, nil
}

func validateInput(rawURL string, intervalSeconds int64) (string, error) {
	address := strings.TrimSpace(rawURL)
	parsed, err := url.ParseRequestURI(address)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.User != nil {
		return "", ErrInvalidInput
	}
	if intervalSeconds < 1 {
		return "", ErrInvalidInput
	}
	return address, nil
}
