import { getPool } from "../db";

/**
 * Skill validation utilities
 * Ensures all skill values reference the Skills table
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
 * Check if a skill ID exists and is active
 */
export async function isValidSkill(skillId: string): Promise<boolean> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("SkillId", skillId)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.Skills
      WHERE Id = @SkillId AND IsActive = 1
    `);

  return result.recordset[0].count > 0;
}

/**
 * Validate a skill ID, throw error if invalid
 * @param skillId - The skill ID to validate (null is allowed)
 * @throws Error if skill is not found or inactive
 */
export async function validateSkill(skillId: string | null): Promise<void> {
  if (skillId === null || skillId === undefined) {
    return; // NULL/undefined is allowed for nullable fields
  }

  const valid = await isValidSkill(skillId);
  if (!valid) {
    throw new Error(
      `Invalid skill: "${skillId}". Must be one of the active values in Skills table. ` +
      `Valid values: Listening, Speaking, Reading, Writing, Pronunciation, vocabulary, Grammar, Listening/Reading`
    );
  }
}

/**
 * Get all active skills
 */
export async function getAllActiveSkills(): Promise<Skill[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      Id as id,
      Name as name,
      DisplayName as displayName,
      Description as description,
      Category as category,
      SortOrder as sortOrder,
      IsActive as isActive
    FROM dbo.Skills
    WHERE IsActive = 1
    ORDER BY SortOrder
  `);

  return result.recordset;
}

/**
 * Get skill by ID
 */
export async function getSkillById(skillId: string): Promise<Skill | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("SkillId", skillId)
    .query(`
      SELECT 
        Id as id,
        Name as name,
        DisplayName as displayName,
        Description as description,
        Category as category,
        SortOrder as sortOrder,
        IsActive as isActive
      FROM dbo.Skills
      WHERE Id = @SkillId
    `);

  return result.recordset[0] || null;
}

/**
 * Validate multiple skills at once
 */
export async function validateSkills(
  skillIds: (string | null)[]
): Promise<void> {
  const nonNullSkills = skillIds.filter((s) => s !== null && s !== undefined);

  if (nonNullSkills.length === 0) {
    return;
  }

  const pool = await getPool();
  const placeholders = nonNullSkills.map((_, i) => `@Skill${i}`).join(",");
  const request = pool.request();

  nonNullSkills.forEach((skill, i) => {
    request.input(`Skill${i}`, skill);
  });

  const result = await request.query(`
    SELECT COUNT(*) as count
    FROM dbo.Skills
    WHERE Id IN (${placeholders}) AND IsActive = 1
  `);

  const validCount = result.recordset[0].count;
  if (validCount !== nonNullSkills.length) {
    // Find which skills are invalid
    const validSkills = await Promise.all(
      nonNullSkills.map((s) => isValidSkill(s!))
    );
    const invalidSkills = nonNullSkills.filter((_, i) => !validSkills[i]);

    throw new Error(
      `Invalid skills: ${invalidSkills.join(", ")}. ` +
      `Valid values: Listening, Speaking, Reading, Writing, Pronunciation, vocabulary, Grammar, Listening/Reading`
    );
  }
}

/**
 * Standard skill constants for type safety
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
