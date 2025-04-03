// src/utils/criteriaUtils.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get directory of current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// Default criteria file paths
const DEFAULT_CRITERIA_FILE = path.join(projectRoot, 'promptCriteria.txt');
const ENV_CRITERIA_PATH = process.env.CRITERIA_FILE_PATH;

/**
 * Load analysis criteria from file
 * Will try:
 * 1. Path specified in the .env file as CRITERIA_FILE_PATH
 * 2. Default promptCriteria.txt in the project root
 * 3. A fallback criteria if no file is found
 */
export async function loadAnalysisCriteria(customPath?: string): Promise<string> {
  // Try loading from the provided path first
  if (customPath) {
    try {
      return await fs.readFile(customPath, 'utf8');
    } catch (error) {
      console.warn(`Could not load criteria from specified path: ${customPath}`);
      // Continue to try other locations
    }
  }
  
  // Try loading from the path specified in .env
  if (ENV_CRITERIA_PATH) {
    try {
      return await fs.readFile(ENV_CRITERIA_PATH, 'utf8');
    } catch (error) {
      console.warn(`Could not load criteria from env path: ${ENV_CRITERIA_PATH}`);
      // Continue to try default location
    }
  }
  
  // Try loading from the default location
  try {
    return await fs.readFile(DEFAULT_CRITERIA_FILE, 'utf8');
  } catch (error) {
    console.warn(`Could not load criteria from default path: ${DEFAULT_CRITERIA_FILE}`);
    console.warn('Using fallback criteria. Consider creating a promptCriteria.txt file.');
    
    // Return a fallback criteria
    return `
Evaluate this article for general relevance and quality.
Consider:
1. Information accuracy and factual content
2. Depth of analysis and insight
3. Writing quality and clarity
4. Credibility of sources
5. Timeliness and newsworthiness

The most relevant articles will contain specific, accurate, and insightful information from credible sources.
    `.trim();
  }
}

/**
 * Save criteria to the default file location
 */
export async function saveAnalysisCriteria(criteria: string): Promise<string> {
  const savePath = DEFAULT_CRITERIA_FILE;
  
  try {
    await fs.writeFile(savePath, criteria, 'utf8');
    return savePath;
  } catch (error) {
    console.error(`Could not save criteria to file: ${savePath}`, error);
    throw error;
  }
}