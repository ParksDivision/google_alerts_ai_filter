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
Analyze this article for information about government contracting opportunities for businesses based on the following criteria:

Highly Relevant (75-100 score):
1. Article mentions government funds, bonds, budget allocations, or spending initiatives totaling $10+ million
2. No specific contractors/companies are mentioned as already selected
3. Funding is for business-oriented projects (not individual benefits like tax credits)
4. Any of these funding scenarios applies:
   - Funds are upcoming, proposed, approved but not yet awarded
   - Federal/state funding has been approved for a state/county/municipality, but not yet allocated to specific projects
   - Projects are in early planning stages
5. Article discusses infrastructure, capital improvement, technology, transportation, transit, education, construction, water, or energy projects
6. Publication date is within the past 7 days

Moderately Relevant (50-74 score):
- Article meets most criteria but lacks specific funding amounts
- Projects are in early discussion/approval phases 
- Funding involves bond measures currently being voted on
- Article mentions redirection of previously allocated funds to new purposes
- Government is seeking input on project requirements

Less Relevant (25-49 score):
- Funding is allocated but project timeline is unclear
- Article mentions government intent to fund projects but lacks specifics
- Only partial criteria are met (e.g., funding amount is clear but project type isn't specified)
- Article suggests potential future funding but decisions haven't been made

Not Relevant (0-24 score):
- Article clearly states contractors/developers are already selected
- Bidding process is closed
- Funds have already been fully spent or distributed
- Projects mentioned are exclusively for individual benefits rather than business opportunities
- Article is primarily about completed projects with no mention of future phases
- RFP submission deadlines have passed

Pay special attention to:
- Bond measures that create future contracting opportunities
- Budget approvals at ANY government level that will eventually flow to projects
- Transfers of funds between government entities that may create new opportunities
- Statements about future intent to allocate/spend on certain sectors
- Wording that suggests early stages of project development
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