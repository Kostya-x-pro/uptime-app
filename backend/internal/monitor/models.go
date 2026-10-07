package monitor

import "time"

type Status string

const (
	StatusUp   Status = "up"
	StatusDown Status = "down"
)

type Monitor struct {
	ID                 string     `gorm:"type:uuid;primaryKey" json:"id"`
	UserID             string     `gorm:"type:uuid;not null;index" json:"-"`
	URL                string     `gorm:"not null" json:"url"`
	IntervalSeconds    int64      `gorm:"not null" json:"intervalSeconds"`
	Status             Status     `gorm:"size:16;not null" json:"status"`
	LastCheckedAt      *time.Time `json:"lastCheckedAt"`
	LastResponseTimeMS *int       `json:"lastResponseTimeMs"`
	CreatedAt          time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt          time.Time  `gorm:"not null" json:"updatedAt"`
	Checks             []Check    `gorm:"-" json:"checks"`
}

const MaxMonitorsPerUser = 100

func (Monitor) TableName() string { return "monitors" }

type Check struct {
	ID             string    `gorm:"type:uuid;primaryKey" json:"id"`
	MonitorID      string    `gorm:"type:uuid;not null;index" json:"-"`
	Status         Status    `gorm:"size:16;not null" json:"status"`
	ResponseTimeMS *int      `json:"responseTimeMs"`
	CheckedAt      time.Time `gorm:"not null" json:"checkedAt"`
}

func (Check) TableName() string { return "monitor_checks" }
