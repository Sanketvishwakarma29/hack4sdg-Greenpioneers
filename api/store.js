// Shared In-Memory Store across Vercel serverless function invocations
import { initialReports } from './seedData.js';

export let reports = [...initialReports];
export const submittedPhotoHashes = new Set();
