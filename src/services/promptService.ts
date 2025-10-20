import { query, transaction } from '../db/connection.js';
import {
  AnalysisPrompt,
  CreateAnalysisPromptInput,
  UpdateAnalysisPromptInput,
  ListPromptsQuery,
  PromptWithStats,
} from '../models/AnalysisPrompt.js';

/**
 * Analysis Prompt Service
 * Handles CRUD operations for analysis prompts
 */

/**
 * Create a new analysis prompt
 */
export async function createPrompt(
  userId: string,
  input: CreateAnalysisPromptInput
): Promise<AnalysisPrompt> {
  // Check if prompt name already exists for this user
  const existing = await query<AnalysisPrompt>(
    'SELECT id FROM analysis_prompts WHERE user_id = $1 AND name = $2',
    [userId, input.name]
  );

  if (existing.rows.length > 0) {
    throw new Error('Prompt with this name already exists');
  }

  // If setting as default, unset other defaults first
  if (input.is_default) {
    await query(
      'UPDATE analysis_prompts SET is_default = false WHERE user_id = $1',
      [userId]
    );
  }

  // Create prompt
  const result = await query<AnalysisPrompt>(
    `INSERT INTO analysis_prompts (user_id, name, description, prompt_text, is_default)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, input.name, input.description || null, input.prompt_text, input.is_default ?? false]
  );

  return result.rows[0];
}

/**
 * Get prompt by ID
 */
export async function getPromptById(
  promptId: string,
  userId: string
): Promise<AnalysisPrompt | null> {
  const result = await query<AnalysisPrompt>(
    'SELECT * FROM analysis_prompts WHERE id = $1 AND user_id = $2',
    [promptId, userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * List all prompts for a user
 */
export async function listPrompts(
  userId: string,
  filters: ListPromptsQuery = { limit: '50', offset: '0' }
): Promise<{ prompts: AnalysisPrompt[]; total: number }> {
  // Build query dynamically based on filters
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM analysis_prompts WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get prompts with pagination
  params.push(filters.limit, filters.offset);
  const result = await query<AnalysisPrompt>(
    `SELECT * FROM analysis_prompts
     WHERE ${whereClause}
     ORDER BY is_default DESC, created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  return {
    prompts: result.rows,
    total,
  };
}

/**
 * Update prompt
 */
export async function updatePrompt(
  promptId: string,
  userId: string,
  updates: UpdateAnalysisPromptInput
): Promise<AnalysisPrompt> {
  // Check if prompt exists and belongs to user
  const existing = await getPromptById(promptId, userId);
  if (!existing) {
    throw new Error('Prompt not found');
  }

  // If setting as default, unset other defaults first
  if (updates.is_default === true) {
    await query(
      'UPDATE analysis_prompts SET is_default = false WHERE user_id = $1',
      [userId]
    );
  }

  // Build update query dynamically
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    // Check for duplicate name
    const duplicate = await query<AnalysisPrompt>(
      'SELECT id FROM analysis_prompts WHERE user_id = $1 AND name = $2 AND id != $3',
      [userId, updates.name, promptId]
    );
    if (duplicate.rows.length > 0) {
      throw new Error('Prompt with this name already exists');
    }

    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.prompt_text !== undefined) {
    setClauses.push(`prompt_text = $${paramIndex++}`);
    values.push(updates.prompt_text);
  }

  if (updates.is_default !== undefined) {
    setClauses.push(`is_default = $${paramIndex++}`);
    values.push(updates.is_default);
  }

  if (setClauses.length === 0) {
    // No updates, just return existing prompt
    return existing;
  }

  // Add updated_at
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add promptId and userId for WHERE clause
  values.push(promptId, userId);

  const result = await query<AnalysisPrompt>(
    `UPDATE analysis_prompts
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Prompt not found');
  }

  return result.rows[0];
}

/**
 * Delete prompt
 */
export async function deletePrompt(promptId: string, userId: string): Promise<void> {
  const result = await query(
    'DELETE FROM analysis_prompts WHERE id = $1 AND user_id = $2',
    [promptId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Prompt not found');
  }
}

/**
 * Set prompt as default
 * Only one prompt can be default per user
 */
export async function setDefaultPrompt(
  promptId: string,
  userId: string
): Promise<AnalysisPrompt> {
  return await transaction(async (client) => {
    // Unset all defaults for this user
    await client.query(
      'UPDATE analysis_prompts SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set this prompt as default
    const result = await client.query<AnalysisPrompt>(
      `UPDATE analysis_prompts
       SET is_default = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [promptId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Prompt not found');
    }

    return result.rows[0];
  });
}

/**
 * Get default prompt for user
 */
export async function getDefaultPrompt(userId: string): Promise<AnalysisPrompt | null> {
  const result = await query<AnalysisPrompt>(
    'SELECT * FROM analysis_prompts WHERE user_id = $1 AND is_default = true',
    [userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Increment usage count for a prompt
 */
export async function incrementPromptUsage(promptId: string): Promise<void> {
  await query(
    'UPDATE analysis_prompts SET usage_count = usage_count + 1 WHERE id = $1',
    [promptId]
  );
}

/**
 * Get prompts with usage statistics
 */
export async function getPromptsWithStats(userId: string): Promise<PromptWithStats[]> {
  const result = await query<PromptWithStats>(
    `SELECT
       p.*,
       COUNT(j.id) FILTER (WHERE j.created_at > NOW() - INTERVAL '30 days') as recent_job_count,
       MAX(j.created_at) as last_used
     FROM analysis_prompts p
     LEFT JOIN analysis_jobs j ON p.id = j.prompt_id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.is_default DESC, p.usage_count DESC, p.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Duplicate a prompt (for creating variations)
 */
export async function duplicatePrompt(
  promptId: string,
  userId: string,
  newName: string
): Promise<AnalysisPrompt> {
  const original = await getPromptById(promptId, userId);
  if (!original) {
    throw new Error('Prompt not found');
  }

  return createPrompt(userId, {
    name: newName,
    description: original.description || undefined,
    prompt_text: original.prompt_text,
    is_default: false,
  });
}
