package monitor

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/your-org/uptime-app-backend/internal/auth"
)

type testAccessTokenParser struct {
	userID string
	err    error
}

func (parser testAccessTokenParser) ParseAccessToken(string) (string, error) {
	return parser.userID, parser.err
}

func deleteMonitorRequest(handler http.Handler, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodDelete, "/api/v1/monitors/monitor-id", nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestDeleteHandlerReturnsNoContentForOwner(t *testing.T) {
	repository := &memoryRepository{monitors: []Monitor{{ID: "monitor-id", UserID: "user-id"}}}
	service := NewService(repository, fixedChecker{status: StatusUp})
	handler := auth.RequireAccessToken(testAccessTokenParser{userID: "user-id"}, NewHTTPHandler(service))

	response := deleteMonitorRequest(handler, "access-token")
	if response.Code != http.StatusNoContent {
		t.Fatalf("DELETE monitor status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if len(repository.monitors) != 0 {
		t.Fatalf("stored monitors after DELETE = %+v", repository.monitors)
	}
}

func TestDeleteHandlerDoesNotDeleteAnotherUsersMonitor(t *testing.T) {
	repository := &memoryRepository{monitors: []Monitor{{ID: "monitor-id", UserID: "owner-id"}}}
	service := NewService(repository, fixedChecker{status: StatusUp})
	handler := auth.RequireAccessToken(testAccessTokenParser{userID: "other-user-id"}, NewHTTPHandler(service))

	response := deleteMonitorRequest(handler, "access-token")
	if response.Code != http.StatusNotFound {
		t.Fatalf("DELETE monitor status = %d, want %d", response.Code, http.StatusNotFound)
	}
	if len(repository.monitors) != 1 {
		t.Fatalf("stored monitors after unauthorized DELETE = %+v", repository.monitors)
	}
}

func TestDeleteHandlerRequiresAccessToken(t *testing.T) {
	service := NewService(&memoryRepository{}, fixedChecker{status: StatusUp})
	handler := auth.RequireAccessToken(testAccessTokenParser{err: errors.New("invalid token")}, NewHTTPHandler(service))

	response := deleteMonitorRequest(handler, "")
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("DELETE monitor without token status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}

func TestCreateHandlerStoresMonitorName(t *testing.T) {
	repository := &memoryRepository{}
	service := NewService(repository, fixedChecker{status: StatusUp})
	handler := auth.RequireAccessToken(testAccessTokenParser{userID: "user-id"}, NewHTTPHandler(service))
	request := httptest.NewRequest(http.MethodPost, "/api/v1/monitors", strings.NewReader(`{"name":"Основной сайт","url":"https://example.com","intervalSeconds":60}`))
	request.Header.Set("Authorization", "Bearer access-token")
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("POST monitor status = %d, want %d", response.Code, http.StatusCreated)
	}
	if len(repository.monitors) != 1 || repository.monitors[0].Name != "Основной сайт" {
		t.Fatalf("stored monitors = %+v", repository.monitors)
	}
}
