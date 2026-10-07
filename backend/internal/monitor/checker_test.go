package monitor

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPCheckerReportsUpForSuccessfulResource(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	status, responseTime := newHTTPChecker(server.Client()).Check(context.Background(), server.URL)
	if status != StatusUp || responseTime == nil {
		t.Fatalf("Check() = %q, %v; want up with response time", status, responseTime)
	}
}

func TestHTTPCheckerReportsDownForServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	status, _ := newHTTPChecker(server.Client()).Check(context.Background(), server.URL)
	if status != StatusDown {
		t.Fatalf("Check() status = %q, want down", status)
	}
}
