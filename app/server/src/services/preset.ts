import { db } from '../db/index.js';
import { presetPrompts } from '../db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import pino from 'pino';
import crypto from 'crypto';
import type { PresetPrompt, NewPresetPrompt } from '../db/schema.js';

const logger = pino({ name: 'preset-service' });

export interface CreatePresetInput {
  presetId: string;
  name: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  imagePath?: string;
  prompt: string;
}

export interface UpdatePresetInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  imagePath?: string;
  prompt?: string;
}

export interface ListPresetsOptions {
  enabled?: boolean;
  limit?: number;
}

export interface PresetStats {
  totalPresets: number;
  enabledPresets: number;
  disabledPresets: number;
}

export class PresetService {
  async create(input: CreatePresetInput): Promise<string> {
    try {
      // Check if preset_id already exists
      const existing = await this.getByPresetId(input.presetId);
      if (existing) {
        throw new Error(`Preset with ID '${input.presetId}' already exists`);
      }

      const presetData: NewPresetPrompt = {
        id: crypto.randomUUID().toLowerCase().replace(/-/g, ''),
        presetId: input.presetId,
        name: input.name,
        description: input.description,
        enabled: input.enabled ?? true,
        icon: input.icon,
        imagePath: input.imagePath,
        prompt: input.prompt,
      };

      const result = await db.insert(presetPrompts).values(presetData).returning({ id: presetPrompts.id });
      const insertedId = result[0].id;

      logger.info({ presetId: input.presetId, id: insertedId }, 'Preset created');
      return insertedId;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create preset');
      throw error;
    }
  }

  async getById(id: string): Promise<PresetPrompt | null> {
    try {
      const result = await db
        .select()
        .from(presetPrompts)
        .where(eq(presetPrompts.id, id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get preset by ID');
      throw error;
    }
  }

  async getByPresetId(presetId: string): Promise<PresetPrompt | null> {
    try {
      const result = await db
        .select()
        .from(presetPrompts)
        .where(eq(presetPrompts.presetId, presetId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ error, presetId }, 'Failed to get preset by preset ID');
      throw error;
    }
  }

  async list(options: ListPresetsOptions = {}): Promise<PresetPrompt[]> {
    try {
      // Build query with proper typing - sort by orderIndex ascending
      if (options.enabled !== undefined && options.limit) {
        const results = await db
          .select()
          .from(presetPrompts)
          .where(eq(presetPrompts.enabled, options.enabled))
          .orderBy(asc(presetPrompts.orderIndex))
          .limit(options.limit);
        return results;
      } else if (options.enabled !== undefined) {
        const results = await db
          .select()
          .from(presetPrompts)
          .where(eq(presetPrompts.enabled, options.enabled))
          .orderBy(asc(presetPrompts.orderIndex));
        return results;
      } else if (options.limit) {
        const results = await db
          .select()
          .from(presetPrompts)
          .orderBy(asc(presetPrompts.orderIndex))
          .limit(options.limit);
        return results;
      } else {
        const results = await db
          .select()
          .from(presetPrompts)
          .orderBy(asc(presetPrompts.orderIndex));
        return results;
      }
    } catch (error) {
      logger.error({ error, options }, 'Failed to list presets');
      throw error;
    }
  }

  async update(id: string, input: UpdatePresetInput): Promise<boolean> {
    try {
      const updateData: any = {
        ...input,
        updatedAt: new Date().toISOString(),
      };

      await db
        .update(presetPrompts)
        .set(updateData)
        .where(eq(presetPrompts.id, id));

      logger.info({ id, input }, 'Preset updated');
      return true;
    } catch (error) {
      logger.error({ error, id, input }, 'Failed to update preset');
      throw error;
    }
  }

  async updateByPresetId(presetId: string, input: UpdatePresetInput): Promise<boolean> {
    try {
      const updateData: any = {
        ...input,
        updatedAt: new Date().toISOString(),
      };

      await db
        .update(presetPrompts)
        .set(updateData)
        .where(eq(presetPrompts.presetId, presetId));

      logger.info({ presetId, input }, 'Preset updated by preset ID');
      return true;
    } catch (error) {
      logger.error({ error, presetId, input }, 'Failed to update preset by preset ID');
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db
        .delete(presetPrompts)
        .where(eq(presetPrompts.id, id));

      logger.info({ id }, 'Preset deleted');
      return true;
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete preset');
      throw error;
    }
  }

  async deleteByPresetId(presetId: string): Promise<boolean> {
    try {
      await db
        .delete(presetPrompts)
        .where(eq(presetPrompts.presetId, presetId));

      logger.info({ presetId }, 'Preset deleted by preset ID');
      return true;
    } catch (error) {
      logger.error({ error, presetId }, 'Failed to delete preset by preset ID');
      throw error;
    }
  }

  async toggle(id: string): Promise<boolean> {
    try {
      // Get current enabled state
      const preset = await this.getById(id);
      if (!preset) {
        throw new Error(`Preset with ID '${id}' not found`);
      }

      const newEnabledState = !preset.enabled;
      await this.update(id, { enabled: newEnabledState });

      logger.info({ id, enabled: newEnabledState }, 'Preset toggled');
      return newEnabledState;
    } catch (error) {
      logger.error({ error, id }, 'Failed to toggle preset');
      throw error;
    }
  }

  async getStats(): Promise<PresetStats> {
    try {
      const [totalResult, enabledResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(presetPrompts),
        db.select({ count: sql<number>`count(*)` }).from(presetPrompts).where(eq(presetPrompts.enabled, true)),
      ]);

      const totalPresets = totalResult[0].count;
      const enabledPresets = enabledResult[0].count;
      const disabledPresets = totalPresets - enabledPresets;

      return {
        totalPresets,
        enabledPresets,
        disabledPresets,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get preset stats');
      throw error;
    }
  }

  async exists(presetId: string): Promise<boolean> {
    try {
      const preset = await this.getByPresetId(presetId);
      return preset !== null;
    } catch (error) {
      logger.error({ error, presetId }, 'Failed to check if preset exists');
      throw error;
    }
  }

  async getEnabledPresets(): Promise<PresetPrompt[]> {
    return this.list({ enabled: true });
  }

  async bulkUpdateEnabled(ids: string[], enabled: boolean): Promise<number> {
    try {
      let updatedCount = 0;

      for (const id of ids) {
        await this.update(id, { enabled });
        updatedCount++;
      }

      logger.info({ ids, enabled, updatedCount }, 'Bulk updated preset enabled status');
      return updatedCount;
    } catch (error) {
      logger.error({ error, ids, enabled }, 'Failed to bulk update presets');
      throw error;
    }
  }

  async updateImage(id: string, imagePath: string | null): Promise<boolean> {
    try {
      await db
        .update(presetPrompts)
        .set({
          imagePath,
          updatedAt: new Date().toISOString()
        })
        .where(eq(presetPrompts.id, id));

      logger.info({ id, imagePath }, 'Preset image updated');
      return true;
    } catch (error) {
      logger.error({ error, id, imagePath }, 'Failed to update preset image');
      throw error;
    }
  }

  async reorder(orderedIds: string[]): Promise<boolean> {
    try {
      // Update each preset's orderIndex based on its position in the array
      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(presetPrompts)
          .set({
            orderIndex: i,
            updatedAt: new Date().toISOString()
          })
          .where(eq(presetPrompts.id, orderedIds[i]));
      }

      logger.info({ count: orderedIds.length }, 'Presets reordered');
      return true;
    } catch (error) {
      logger.error({ error, orderedIds }, 'Failed to reorder presets');
      throw error;
    }
  }
}

// Export singleton instance
export const presetService = new PresetService();