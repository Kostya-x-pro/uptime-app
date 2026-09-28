package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"
)

const refreshCookieName = "refresh_token"

type HTTPHandler struct {
	service        *Service
	frontendOrigin string
	cookieSecure   bool
}

func NewHTTPHandler(service *Service, frontendOrigin string, cookieSecure bool) http.Handler {
	h := &HTTPHandler{service: service, frontendOrigin: frontendOrigin, cookieSecure: cookieSecure}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/register", h.register)
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.logout)
	return h.cors(mux)
}

func (h *HTTPHandler) register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput
	if !decodeJSON(w, r, &input) {
		return
	}
	pair, err := h.service.Register(r.Context(), input)
	if err != nil {
		handleAuthError(w, err)
		return
	}
	h.writeTokens(w, pair, http.StatusCreated)
}

func (h *HTTPHandler) login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if !decodeJSON(w, r, &input) {
		return
	}
	pair, err := h.service.Login(r.Context(), input)
	if err != nil {
		handleAuthError(w, err)
		return
	}
	h.writeTokens(w, pair, http.StatusOK)
}

func (h *HTTPHandler) refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_refresh_token")
		return
	}
	pair, err := h.service.Refresh(r.Context(), cookie.Value)
	if err != nil {
		handleAuthError(w, err)
		return
	}
	h.writeTokens(w, pair, http.StatusOK)
}

func (h *HTTPHandler) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookieName); err == nil {
		if err := h.service.Logout(r.Context(), cookie.Value); err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error")
			return
		}
	}
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *HTTPHandler) writeTokens(w http.ResponseWriter, pair TokenPair, status int) {
	h.setRefreshCookie(w, pair.RefreshToken, pair.RefreshUntil)
	writeJSON(w, status, map[string]string{"accessToken": pair.AccessToken})
}

func (h *HTTPHandler) setRefreshCookie(w http.ResponseWriter, value string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{Name: refreshCookieName, Value: value, Path: "/api/v1/auth", Expires: expires, MaxAge: int(time.Until(expires).Seconds()), HttpOnly: true, Secure: h.cookieSecure, SameSite: http.SameSiteLaxMode})
}

func (h *HTTPHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: refreshCookieName, Value: "", Path: "/api/v1/auth", MaxAge: -1, HttpOnly: true, Secure: h.cookieSecure, SameSite: http.SameSiteLaxMode})
}

func (h *HTTPHandler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && origin == h.frontendOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			if origin == "" || origin != h.frontendOrigin {
				writeError(w, http.StatusForbidden, "cors_origin_not_allowed")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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

func handleAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_request")
	case errors.Is(err, ErrEmailAlreadyRegistered):
		writeError(w, http.StatusConflict, "email_already_registered")
	case errors.Is(err, ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "invalid_credentials")
	case errors.Is(err, ErrInvalidSession):
		writeError(w, http.StatusUnauthorized, "invalid_refresh_token")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
