CREATE TABLE monitors (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    interval_seconds BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL,
    last_checked_at TIMESTAMPTZ NULL,
    last_response_time_ms INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT monitors_interval_seconds_check CHECK (interval_seconds > 0),
    CONSTRAINT monitors_status_check CHECK (status IN ('up', 'down'))
);

CREATE INDEX monitors_user_id_idx ON monitors(user_id);

CREATE TABLE monitor_checks (
    id UUID PRIMARY KEY,
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    response_time_ms INTEGER NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT monitor_checks_status_check CHECK (status IN ('up', 'down'))
);

CREATE INDEX monitor_checks_monitor_checked_idx ON monitor_checks(monitor_id, checked_at DESC);
