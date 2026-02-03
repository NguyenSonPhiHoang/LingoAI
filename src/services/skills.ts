/**
 * Skills API service
 */

import { apiGet } from "./api";
import { Skill } from "@/constants/skills";

/**
 * Fetch all active skills from the server
 */
export async function fetchSkills(): Promise<Skill[]> {
  const response = await apiGet<{ skills: Skill[] }>("/api/skills");
  return response.skills;
}

/**
 * Cache for skills (to avoid repeated API calls)
 */
let skillsCache: Skill[] | null = null;
let skillsCacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get skills with caching
 */
export async function getSkills(forceRefresh = false): Promise<Skill[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    skillsCache &&
    skillsCacheTime &&
    now - skillsCacheTime < CACHE_DURATION
  ) {
    return skillsCache;
  }

  const skills = await fetchSkills();
  skillsCache = skills;
  skillsCacheTime = now;

  return skills;
}

/**
 * Clear skills cache
 */
export function clearSkillsCache(): void {
  skillsCache = null;
  skillsCacheTime = null;
}
