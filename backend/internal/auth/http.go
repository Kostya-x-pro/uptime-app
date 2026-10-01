package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const refreshCookieName = "refresh_token"
const maxAvatarSize = 15 << 20

type HTTPHandler struct {
	service        *Service
	tokens         TokenManager
	frontendOrigin string
	cookieSecure   bool
	avatarsDir     string
}

func NewHTTPHandler(service *Service, tokens TokenManager, frontendOrigin string, cookieSecure bool, avatarsDir string) http.Handler {
	h := &HTTPHandler{service: service, tokens: tokens, frontendOrigin: frontendOrigin, cookieSecure: cookieSecure, avatarsDir: avatarsDir}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/register", h.register)
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.logout)
	mux.HandleFunc("GET /api/v1/profile", h.profile)
	mux.HandleFunc("PATCH /api/v1/profile", h.updateProfile)
	mux.HandleFunc("POST /api/v1/profile/avatar", h.uploadAvatar)
	return h.cors(mux)
}

func (h *HTTPHandler) uploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.accessUserID(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarSize+1<<20)
	if err := r.ParseMultipartForm(maxAvatarSize); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			writeError(w, http.StatusRequestEntityTooLarge, "avatar_too_large")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_avatar")
		return
	}
	file, _, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_avatar")
		return
	}
	defer file.Close()

	extension, err := avatarExtension(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_avatar")
		return
	}
	fileName, err := NewID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := os.MkdirAll(h.avatarsDir, 0o750); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	temporary, err := os.CreateTemp(h.avatarsDir, ".avatar-*")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	if _, err := io.Copy(temporary, file); err != nil || temporary.Close() != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	storedName := fileName + extension
	if err := os.Rename(temporaryName, filepath.Join(h.avatarsDir, storedName)); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	profile, err := h.service.UpdateAvatarURL(r.Context(), userID, "/uploads/avatars/"+storedName)
	if err != nil {
		_ = os.Remove(filepath.Join(h.avatarsDir, storedName))
		handleProfileError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func avatarExtension(file io.ReadSeeker) (string, error) {
	buffer := make([]byte, 512)
	count, err := file.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	switch http.DetectContentType(buffer[:count]) {
	case "image/jpeg":
		return ".jpg", nil
	case "image/png":
		return ".png", nil
	case "image/gif":
		return ".gif", nil
	default:
		return "", fmt.Errorf("unsupported avatar type")
	}
}

func (h *HTTPHandler) profile(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.accessUserID(w, r)
	if !ok {
		return
	}
	profile, err := h.service.Profile(r.Context(), userID)
	if err != nil {
		handleProfileError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (h *HTTPHandler) updateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.accessUserID(w, r)
	if !ok {
		return
	}
	var input UpdateProfileInput
	if !decodeJSON(w, r, &input) {
		return
	}
	profile, err := h.service.UpdateProfile(r.Context(), userID, input)
	if err != nil {
		handleProfileError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
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
			w.Header().Set("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS")
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

func (h *HTTPHandler) accessUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	const prefix = "Bearer "
	value := r.Header.Get("Authorization")
	if !strings.HasPrefix(value, prefix) {
		writeError(w, http.StatusUnauthorized, "invalid_access_token")
		return "", false
	}
	userID, err := h.tokens.ParseAccessToken(strings.TrimPrefix(value, prefix))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_access_token")
		return "", false
	}
	return userID, true
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

func handleProfileError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_request")
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "user_not_found")
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
