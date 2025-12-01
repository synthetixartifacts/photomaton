import { promises as fs } from 'fs';
import crypto from 'crypto';
import pino from 'pino';
import { providerManager } from '../providers/manager.js';
import { photoService } from './photo.js';
import { createAPILogger } from '../utils/apiLogger.js';
import { logTransformStep } from '../utils/transformLogger.js';
import { getWatermarkService } from './watermark.js';
import type { PresetType } from '@photomaton/shared';

const logger = pino({ name: 'transform-service' });

export interface TransformJob {
  id: string;
  photoId: string;
  preset: PresetType;
  provider?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class TransformService {
  private jobs: Map<string, TransformJob> = new Map();
  private queue: TransformJob[] = [];
  private isProcessing = false;

  async processPhoto(photoId: string, preset: PresetType, provider?: string): Promise<string> {
    logTransformStep(
      'SERVICE_PROCESS_START',
      { photoId, preset, requestedProvider: provider },
      `Transform service processing photo with provider: ${provider || 'default'}`
    );

    // Get photo from database
    const photo = await photoService.get(photoId);
    if (!photo) {
      logTransformStep(
        'SERVICE_ERROR',
        { photoId, errorCode: 'PHOTO_NOT_FOUND' },
        `Photo not found in service: ${photoId}`,
        'error'
      );
      throw new Error(`Photo not found: ${photoId}`);
    }

    // Create job
    const jobId = crypto.randomUUID();
    const job: TransformJob = {
      id: jobId,
      photoId,
      preset,
      provider,
      status: 'queued',
      createdAt: new Date()
    };

    logTransformStep(
      'SERVICE_JOB_CREATED',
      {
        jobId,
        photoId,
        preset,
        requestedProvider: provider,
        queueLength: this.queue.length,
        isProcessing: this.isProcessing
      },
      `Transform job created - Queue length: ${this.queue.length}, Processing: ${this.isProcessing}`
    );

    this.jobs.set(jobId, job);
    this.queue.push(job);

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        await this.processJob(job);
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Job processing failed');
      }
    }

    this.isProcessing = false;
  }

  private async processJob(job: TransformJob) {
    const apiLogger = createAPILogger('transform-service', 'processJob', job.photoId);

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();

      logger.info({
        jobId: job.id,
        photoId: job.photoId,
        preset: job.preset,
        provider: job.provider
      }, 'Starting transform job');

      // Get photo details
      const photo = await photoService.get(job.photoId);
      if (!photo) {
        throw new Error(`Photo not found: ${job.photoId}`);
      }

      // Update photo status
      await photoService.update(job.photoId, { status: 'processing' });

      // Get provider with detailed logging
      logTransformStep(
        'SERVICE_GET_PROVIDER_START',
        {
          jobId: job.id,
          photoId: job.photoId,
          requestedProvider: job.provider
        },
        `Requesting provider: ${job.provider || 'default'}`
      );

      const provider = await providerManager.getProvider(job.provider);

      logTransformStep(
        'SERVICE_PROVIDER_SELECTED',
        {
          jobId: job.id,
          photoId: job.photoId,
          requestedProvider: job.provider,
          selectedProvider: provider.name
        },
        `Provider selected successfully: ${provider.name}`
      );

      logger.info({
        jobId: job.id,
        photoId: job.photoId,
        provider: provider.name
      }, 'Using provider for transformation');

      // Read original image
      const originalBuffer = await fs.readFile(photo.originalPath);

      // Create output path for the transformed image
      const outputPath = `/data/photos/${job.photoId}/styled-${job.preset}.jpg`;

      // Transform image
      const startTime = Date.now();

      logger.info({
        jobId: job.id,
        photoId: job.photoId,
        preset: job.preset,
        originalSize: originalBuffer.length,
        outputPath
      }, 'Calling provider transform method');

      logTransformStep(
        'SERVICE_TRANSFORM_START',
        {
          jobId: job.id,
          photoId: job.photoId,
          preset: job.preset,
          provider: provider.name,
          originalSize: originalBuffer.length,
          outputPath
        },
        `Starting transform with provider: ${provider.name}`
      );

      const result = await provider.transform({
        photoId: job.photoId,
        originalPath: photo.originalPath,
        outputPath,
        preset: job.preset,
        buffer: originalBuffer
      });

      logTransformStep(
        'SERVICE_TRANSFORM_SUCCESS',
        {
          jobId: job.id,
          photoId: job.photoId,
          preset: job.preset,
          provider: result.provider,
          transformedPath: result.transformedPath,
          duration: result.duration
        },
        `Transform completed successfully - Provider: ${result.provider}, Duration: ${result.duration}ms`
      );

      // The provider writes directly to outputPath, so use that
      const transformedPath = result.transformedPath || outputPath;

      // Apply watermark to transformed image
      const watermarkService = getWatermarkService();
      if (watermarkService) {
        const watermarkResult = await watermarkService.applyWatermark(transformedPath);
        logTransformStep(
          'SERVICE_WATERMARK_APPLIED',
          {
            jobId: job.id,
            photoId: job.photoId,
            watermarkApplied: watermarkResult.watermarkApplied,
            error: watermarkResult.error
          },
          `Watermark ${watermarkResult.watermarkApplied ? 'applied' : 'skipped'}`
        );
      }

      const processingTime = Date.now() - startTime;

      // Update photo in database
      await photoService.update(job.photoId, {
        transformedPath,
        provider: result.provider,
        processingTime,
        status: 'completed'
      });

      // Update job
      job.status = 'completed';
      job.completedAt = new Date();

      logger.info({
        jobId: job.id,
        photoId: job.photoId,
        preset: job.preset,
        processingTime,
        provider: result.provider
      }, 'Transform job completed');

    } catch (error: any) {
      logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        jobId: job.id,
        photoId: job.photoId,
        preset: job.preset,
        provider: job.provider
      }, 'Transform job failed');

      // Update job
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error.message;

      // Update photo status to failed (not stuck in processing)
      try {
        await photoService.update(job.photoId, { status: 'failed' });
      } catch (updateError) {
        logger.error({
          error: updateError,
          photoId: job.photoId
        }, 'Failed to update photo status to failed');
      }

      // Log to API call log
      apiLogger.setError(error);
      await apiLogger.writeToFile();

      throw error;
    }
  }

  getJob(jobId: string): TransformJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobStatus(jobId: string): string {
    const job = this.jobs.get(jobId);
    return job ? job.status : 'not_found';
  }

  async processImmediate(
    photoId: string,
    preset: PresetType,
    originalBuffer: Buffer
  ): Promise<{ transformedPath: string; processingTime: number }> {
    const apiLogger = createAPILogger('transform-service', 'processImmediate', photoId);

    try {
      const startTime = Date.now();

      logger.info({
        photoId,
        preset,
        bufferSize: originalBuffer.length
      }, 'Starting immediate transformation');

      // Get provider (uses default provider, no specific provider selection)
      logTransformStep(
        'SERVICE_IMMEDIATE_GET_PROVIDER',
        {
          photoId,
          preset,
          requestedProvider: 'default'
        },
        `Getting default provider for immediate processing`
      );

      const provider = await providerManager.getProvider();

      logTransformStep(
        'SERVICE_IMMEDIATE_PROVIDER_SELECTED',
        {
          photoId,
          preset,
          selectedProvider: provider.name
        },
        `Immediate processing using provider: ${provider.name}`
      );

      // Create output path for the transformed image
      const outputPath = `/data/photos/${photoId}/styled-${preset}.jpg`;

      // Transform image
      const result = await provider.transform({
        photoId,
        outputPath,
        preset,
        buffer: originalBuffer
      });

      // The provider writes directly to outputPath
      const transformedPath = result.transformedPath || outputPath;

      // Apply watermark to transformed image
      const watermarkService = getWatermarkService();
      if (watermarkService) {
        const watermarkResult = await watermarkService.applyWatermark(transformedPath);
        logTransformStep(
          'SERVICE_IMMEDIATE_WATERMARK_APPLIED',
          {
            photoId,
            watermarkApplied: watermarkResult.watermarkApplied,
            error: watermarkResult.error
          },
          `Watermark ${watermarkResult.watermarkApplied ? 'applied' : 'skipped'}`
        );
      }

      const processingTime = Date.now() - startTime;

      // Update photo in database
      await photoService.update(photoId, {
        transformedPath,
        provider: result.provider,
        processingTime,
        status: 'completed'
      });

      logger.info({
        photoId,
        preset,
        processingTime,
        provider: result.provider
      }, 'Immediate transform completed');

      return { transformedPath, processingTime };
    } catch (error: any) {
      logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        photoId,
        preset
      }, 'Immediate transform failed');

      // Always reset status to failed on error
      try {
        await photoService.update(photoId, { status: 'failed' });
      } catch (updateError) {
        logger.error({ error: updateError, photoId }, 'Failed to update photo status');
      }

      // Log to API call log
      apiLogger.setError(error);
      await apiLogger.writeToFile();

      throw error;
    }
  }
}

// Export singleton instance
export const transformService = new TransformService();