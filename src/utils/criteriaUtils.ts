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
Analyze this article for information about government contracting opportunities and evalutate based on the following criteria.
Consider:
1. Government funding at or above 10 million dollars per project.
2. There must not be a developer or contractor already attached to (or partnered) with the project.
3. The funding opportunity must be geared toward businesses, not individuals.
4. The opportunity listed must include available, upcoming or future funds. The funds must not already be spent.
5. The original publication date of the article should be from within the past 7 days.

The most relevant articles will contain funding related to infrascture, capital improvement, technology, transporation, transit, education, construction, water, and energy projects.
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