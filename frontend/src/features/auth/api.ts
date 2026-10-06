import { apiBaseUrl, apiRequest } from "@/shared/api/client";

export type AuthResponse = {
  accessToken: string;
};

export type UserProfile = {
  id: string;
  email: string;
	name: string;
	avatarUrl: string;
};

export type UploadedFile = {
  name: string;
  url: string;
  contentType: string;
  size: number;
};

export { ApiError as AuthApiError } from "@/shared/api/client";

export function register(input: { email: string; name: string; password: string }) {
  return apiRequest<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refresh() {
  return apiRequest<AuthResponse>("/api/v1/auth/refresh", { method: "POST" });
}

export function logout() {
  return apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
}

export function getProfile(accessToken: string) {
  return apiRequest<UserProfile>("/api/v1/profile", {
    accessToken,
  });
}

export function updateProfile(accessToken: string, input: { name: string }) {
  return apiRequest<UserProfile>("/api/v1/profile", {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(accessToken: string, avatar: File) {
  const body = new FormData();
  body.append("avatar", avatar);
  return apiRequest<UserProfile>("/api/v1/profile/avatar", {
    method: "POST",
    accessToken,
    body,
  });
}

export function uploadFile(accessToken: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<UploadedFile>("/api/v1/files", {
    method: "POST",
    accessToken,
    body,
  });
}

export function avatarSource(avatarUrl: string) {
  return avatarUrl ? `${apiBaseUrl}${avatarUrl}` : "";
}
