package monitor

import (
	"context"
	"net/http"
	"time"
)

type HTTPChecker struct {
	client *http.Client
}

func NewHTTPChecker() *HTTPChecker {
	return &HTTPChecker{client: &http.Client{Timeout: 10 * time.Second}}
}

func (c *HTTPChecker) Check(ctx context.Context, address string) (Status, *int) {
	startedAt := time.Now()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return StatusDown, nil
	}
	response, err := c.client.Do(request)
	if err != nil {
		return StatusDown, nil
	}
	defer response.Body.Close()
	responseTimeMS := int(time.Since(startedAt).Milliseconds())
	if response.StatusCode >= http.StatusInternalServerError {
		return StatusDown, &responseTimeMS
	}
	return StatusUp, &responseTimeMS
}
