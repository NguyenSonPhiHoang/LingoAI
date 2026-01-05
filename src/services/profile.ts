import { apiGet, apiPut } from "./api";

export interface Profile {
  userId: string;
  displayName?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const getProfile = async (): Promise<Profile> => {
  return apiGet<Profile>("/api/profile");
};

export const updateProfile = async (payload: {
  displayName?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  status?: string | null;
}): Promise<Profile> => {
  return apiPut<Profile>("/api/profile", payload);
};

export const uploadPhoto = async (
  file: File
): Promise<{ photoUrl: string; profile: Profile }> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/profile/photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Upload failed: ${res.status}`);
  }

  const data = await res.json();
  return { photoUrl: data.photoUrl, profile: data.profile };
};
