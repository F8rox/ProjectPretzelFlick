import { config } from './config.ts';
import { keys } from './keys.ts';
import type { Result } from './tracked.ts';

export type Settings = { autoPostEnabled: boolean; interactiveThreads: boolean; postDelayMinutes: number };

export type SettingsStore = {
  hSet(key: string, fields: Record<string, string>): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
};

export const getSettings = async (store: SettingsStore): Promise<Settings> => {
  const raw = await store.hGetAll(keys.config);
  const delay = Number(raw.postDelayMinutes);
  return {
    autoPostEnabled: raw.autoPostEnabled === undefined ? config.defaultAutoPost : raw.autoPostEnabled === 'true',
    interactiveThreads: raw.interactiveThreads === undefined ? config.defaultInteractive : raw.interactiveThreads === 'true',
    postDelayMinutes: raw.postDelayMinutes === undefined || !Number.isInteger(delay) ? config.defaultPostDelayMinutes : delay,
  };
};

export const saveSettings = async (store: SettingsStore, input: { autoPostEnabled?: unknown; interactiveThreads?: unknown; postDelayMinutes?: unknown }): Promise<Result> => {
  const delay = input.postDelayMinutes ?? config.defaultPostDelayMinutes;
  if (typeof delay !== 'number' || !Number.isInteger(delay) || delay < 0 || delay > config.maxPostDelayMinutes) {
    return { ok: false, message: `Delay must be a whole number from 0 to ${config.maxPostDelayMinutes} minutes.` };
  }
  await store.hSet(keys.config, {
    autoPostEnabled: String(input.autoPostEnabled === true),
    interactiveThreads: String(input.interactiveThreads === true),
    postDelayMinutes: String(delay),
  });
  return { ok: true, message: 'Settings saved.' };
};
