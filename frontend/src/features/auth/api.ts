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
    data: input,
  });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    data: input,
  });
}

export function refresh() {
  return apiRequest<AuthResponse>("/api/v1/auth/refresh", { method: "POST" });
}

export function logout() {
  return apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
}

export function getProfile() {
  return apiRequest<UserProfile>("/api/v1/profile");
}

export function updateProfile(input: { name: string }) {
  return apiRequest<UserProfile>("/api/v1/profile", {
    method: "PATCH",
    data: input,
  });
}

export function uploadAvatar(avatar: File) {
  const body = new FormData();
  body.append("avatar", avatar);
  return apiRequest<UserProfile>("/api/v1/profile/avatar", {
    method: "POST",
    data: body,
  });
}

export function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<UploadedFile>("/api/v1/files", {
    method: "POST",
    data: body,
  });
}

export function avatarSource(avatarUrl: string) {
  return avatarUrl ? `${apiBaseUrl}${avatarUrl}` : "";
}
