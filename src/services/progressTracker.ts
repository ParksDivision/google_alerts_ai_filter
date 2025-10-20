import { EventEmitter } from 'events';
import { JobProgress, JobStatus } from '../models/AnalysisJob.js';

/**
 * Progress Tracker Service
 * Manages real-time progress updates for analysis jobs
 * Uses EventEmitter for Server-Sent Events (SSE)
 */

class ProgressTracker extends EventEmitter {
  private jobProgress: Map<string, JobProgress> = new Map();
  private jobStartTimes: Map<string, number> = new Map();

  /**
   * Update progress for a job
   */
  updateProgress(jobId: string, update: Partial<JobProgress>): void {
    const current = this.jobProgress.get(jobId) || {
      jobId,
      status: 'pending' as JobStatus,
      progress: 0,
      currentStep: 'Initializing',
      totalArticles: 0,
      processedArticles: 0,
    };

    const updated: JobProgress = { ...current, ...update };

    // Calculate estimated time remaining
    if (updated.progress > 0 && updated.progress < 100) {
      const startTime = this.jobStartTimes.get(jobId) || Date.now();
      const elapsed = Date.now() - startTime;
      const estimatedTotal = (elapsed / updated.progress) * 100;
      updated.estimatedTimeRemaining = Math.round((estimatedTotal - elapsed) / 1000); // in seconds
    }

    this.jobProgress.set(jobId, updated);

    // Emit event for SSE listeners
    this.emit(`progress:${jobId}`, updated);
    this.emit('progress:all', { ...updated });

    console.log(`Job ${jobId}: ${updated.progress}% - ${updated.currentStep}`);
  }

  /**
   * Start tracking a job
   */
  startJob(jobId: string, totalArticles: number = 0): void {
    this.jobStartTimes.set(jobId, Date.now());
    this.updateProgress(jobId, {
      status: 'running',
      progress: 0,
      currentStep: 'Starting job',
      totalArticles,
      processedArticles: 0,
    });
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, message?: string): void {
    this.updateProgress(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
      message: message || 'Job completed successfully',
    });

    // Clean up after a delay
    setTimeout(() => {
      this.jobProgress.delete(jobId);
      this.jobStartTimes.delete(jobId);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): void {
    this.updateProgress(jobId, {
      status: 'failed',
      currentStep: 'Failed',
      message: error,
    });

    // Clean up after a delay
    setTimeout(() => {
      this.jobProgress.delete(jobId);
      this.jobStartTimes.delete(jobId);
    }, 300000); // Keep for 5 minutes
  }

  /**
   * Get current progress for a job
   */
  getProgress(jobId: string): JobProgress | undefined {
    return this.jobProgress.get(jobId);
  }

  /**
   * Clear progress for a job
   */
  clearProgress(jobId: string): void {
    this.jobProgress.delete(jobId);
    this.jobStartTimes.delete(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): JobProgress[] {
    return Array.from(this.jobProgress.values());
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();
