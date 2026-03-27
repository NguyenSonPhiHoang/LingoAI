/**
 * Skill constants and types
 * Must match Skills table in database
 */

export const SKILLS = {
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  READING: "Reading",
  WRITING: "Writing",
  PRONUNCIATION: "Pronunciation",
  VOCABULARY: "vocabulary",
  GRAMMAR: "Grammar",
  LISTENING_READING: "Listening/Reading",
} as const;

export type SkillType = typeof SKILLS[keyof typeof SKILLS];

/**
 * All valid skill values
 * This should match the Skills table in the database
 */
export const VALID_SKILLS: readonly SkillType[] = [
  SKILLS.LISTENING,
  SKILLS.SPEAKING,
  SKILLS.READING,
  SKILLS.WRITING,
  SKILLS.PRONUNCIATION,
  SKILLS.VOCABULARY,
  SKILLS.GRAMMAR,
  SKILLS.LISTENING_READING,
] as const;

/**
 * Skill interface matching database schema
 */
export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Validate if a skill value is valid
 */
export function isValidSkill(skill: string): skill is SkillType {
  return VALID_SKILLS.includes(skill as SkillType);
}

/**
 * Get display name for a skill
 */
export function getSkillDisplayName(skill: SkillType): string {
  const displayNames: Record<SkillType, string> = {
    [SKILLS.LISTENING]: "Listening",
    [SKILLS.SPEAKING]: "Speaking",
    [SKILLS.READING]: "Reading",
    [SKILLS.WRITING]: "Writing",
    [SKILLS.PRONUNCIATION]: "Pronunciation",
    [SKILLS.VOCABULARY]: "Vocabulary",
    [SKILLS.GRAMMAR]: "Grammar",
    [SKILLS.LISTENING_READING]: "Listening & Reading",
  };

  return displayNames[skill] || skill;
}

/**
 * Get icon for a skill (can be used with lucide-react or other icon libraries)
 */
export function getSkillIcon(skill: SkillType): string {
  const icons: Record<SkillType, string> = {
    [SKILLS.LISTENING]: "ear",
    [SKILLS.SPEAKING]: "mic",
    [SKILLS.READING]: "book-open",
    [SKILLS.WRITING]: "pen-tool",
    [SKILLS.PRONUNCIATION]: "volume-2",
    [SKILLS.VOCABULARY]: "book",
    [SKILLS.GRAMMAR]: "file-text",
    [SKILLS.LISTENING_READING]: "headphones",
  };

  return icons[skill] || "circle";
}

/**
 * Get color for a skill (tailwind classes)
 */
export function getSkillColor(skill: SkillType): string {
  const colors: Record<SkillType, string> = {
    [SKILLS.LISTENING]: "blue",
    [SKILLS.SPEAKING]: "green",
    [SKILLS.READING]: "purple",
    [SKILLS.WRITING]: "orange",
    [SKILLS.PRONUNCIATION]: "pink",
    [SKILLS.VOCABULARY]: "indigo",
    [SKILLS.GRAMMAR]: "yellow",
    [SKILLS.LISTENING_READING]: "teal",
  };

  return colors[skill] || "gray";
}
