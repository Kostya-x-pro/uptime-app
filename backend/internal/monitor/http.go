package monitor

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/your-org/uptime-app-backend/internal/auth"
)

type HTTPHandler struct {
	service *Service
}

func NewHTTPHandler(service *Service) http.Handler {
	handler := &HTTPHandler{service: service}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/monitors", handler.list)
	mux.HandleFunc("POST /api/v1/monitors", handler.create)
	mux.HandleFunc("PATCH /api/v1/monitors/{id}", handler.update)
	return mux
}

type monitorInput struct {
	URL             string `json:"url"`
	IntervalSeconds int64  `json:"intervalSeconds"`
}

func (h *HTTPHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid_access_token")
		return
	}
	monitors, err := h.service.List(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, monitors)
}

func (h *HTTPHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid_access_token")
		return
	}
	var input monitorInput
	if !decodeJSON(w, r, &input) {
		return
	}
	created, err := h.service.Create(r.Context(), userID, input.URL, input.IntervalSeconds)
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_monitor")
	case errors.Is(err, ErrMonitorLimitReached):
		writeError(w, http.StatusConflict, "monitor_limit_reached")
	case err != nil:
		writeError(w, http.StatusInternalServerError, "internal_error")
	default:
		writeJSON(w, http.StatusCreated, created)
	}
}

func (h *HTTPHandler) update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid_access_token")
		return
	}
	var input monitorInput
	if !decodeJSON(w, r, &input) {
		return
	}
	updated, err := h.service.Update(r.Context(), userID, r.PathValue("id"), input.URL, input.IntervalSeconds)
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_monitor")
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "monitor_not_found")
	case err != nil:
		writeError(w, http.StatusInternalServerError, "internal_error")
	default:
		writeJSON(w, http.StatusOK, updated)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil || decoder.Decode(&struct{}{}) != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid_request")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
