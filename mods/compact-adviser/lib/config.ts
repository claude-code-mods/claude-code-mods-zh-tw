// Persistent preferences, with the same semantics as the Pi extension's configuration.
//
// `mode`, `minContextTokens`, `contextBudgetTokens`, `logRequests`, `profile`, and
// `beforeCompactPrompt` are the plugin's manifest `userConfig` rows: the host
// validates them, stores them in the user's settings.json, and shows them in /config.
// `typesafeApiKey` is also a userConfig row so it lives in that same settings path, but this
// module hides it from `/config` so the secret is never drawn there. Set, clear, and presence
// are the compact-adviser pane's job.
// `autoAcknowledged` lives in the plugin's own store so that only this mod's confirmation
// dialog can grant experimental automatic mode. A legacy `sharingConsent` field is ignored.

import { parseProfile } from "./profile.ts";

export type Mode = "hint" | "auto" | "off";
export const MODES: readonly Mode[] = ["hint", "auto", "off"];
export const PLUGIN = "compact-adviser";
export const MODE_KEY = `${PLUGIN}.mode`;
export const MINIMUM_KEY = `${PLUGIN}.minContextTokens`;
export const BUDGET_KEY = `${PLUGIN}.contextBudgetTokens`;
export const LOG_KEY = `${PLUGIN}.logRequests`;
export const PROFILE_KEY = `${PLUGIN}.profile`;
export const BEFORE_COMPACT_PROMPT_KEY = `${PLUGIN}.beforeCompactPrompt`;
export const API_KEY_KEY = `${PLUGIN}.typesafeApiKey`;
export const CONSENT_STORE_KEY = "preferences";
export const DEFAULT_MINIMUM = 40000;
export const MAX_SAVED_API_KEY_LENGTH = 1024;

export interface Config {
  mode: Mode;
  minContextTokens: number;
  /** Tokens at which the hint floor is fully relaxed; 0 uses Claude Code's own limit. */
  contextBudgetTokens: number;
  autoAcknowledged: boolean;
  logRequests: boolean;
  /** Trimmed text run before automatic compaction; empty keeps compaction immediate. */
  beforeCompactPrompt: string;
  profile?: string;
}

export interface Consent {
  version: 1;
  autoAcknowledged: boolean;
}

export const DEFAULT_CONSENT: Readonly<Consent> = Object.freeze({
  version: 1,
  autoAcknowledged: false,
});

export function parseMinimum(text: string): number {
  const value = text.trim();
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
    throw new Error("請輸入正整數 token 數，例如 40000。");
  }
  return number;
}

/** A context budget in tokens, or 0 for "off" (Claude Code's own limit). */
export function parseBudget(text: string): number {
  const value = text.trim();
  if (value === "off") return 0;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)) {
    throw new Error("請輸入整數 token 數，例如 450000，或輸入 off。");
  }
  return number;
}

export function parseSavedApiKey(text: string): string {
  const value = text.trim();
  if (!value) throw new Error("請輸入 TypeSafe API 金鑰，或取消以保持原值。");
  if (value.length > MAX_SAVED_API_KEY_LENGTH) {
    throw new Error("該值過長，無法作為 TypeSafe API 金鑰儲存。");
  }
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      throw new Error("金鑰不能包含控制字元。");
    }
  }
  return value;
}

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

/** Reads the stored acknowledgement record; absent means the defaults, anything malformed throws. */
export function parseConsent(value: unknown): Consent {
  if (value === undefined) return { ...DEFAULT_CONSENT };
  const c = value as Record<string, unknown> | null;
  if (
    !c ||
    typeof c !== "object" ||
    Array.isArray(c) ||
    c.version !== 1 ||
    typeof c.autoAcknowledged !== "boolean"
  ) {
    throw new SettingsError(
      "compact-adviser 的同意記錄無效；請執行 /compact-adviser auto 恢復。",
    );
  }
  return { version: 1, autoAcknowledged: c.autoAcknowledged };
}

export interface ConfigRowLike {
  key: string;
  value: unknown;
}

/**
 * Combines the host's `userConfig` values with the stored automatic-mode acknowledgement.
 * The live `/config` rows win, so a change another session saved is seen at once; the
 * options the module loaded with (host-validated, defaults filled in) stand in for a row
 * the menu has not listed yet, as happens at startup. The host already maps a stored mode
 * outside the options to its `hint` default; a value of the wrong kind is reported rather
 * than silently replaced. A legacy `sharingConsent` field is ignored: installing the
 * package is consent to send eligible checkpoint context when a key is available.
 */
export function readConfig(
  rows: readonly ConfigRowLike[],
  consentValue: unknown,
  loaded: Readonly<Record<string, unknown>> = {},
): Config {
  const row = (key: string, field: string) =>
    rows.find((candidate) => candidate.key === key)?.value ?? loaded[field];
  const mode = row(MODE_KEY, "mode");
  const minimum = row(MINIMUM_KEY, "minContextTokens");
  const budget = row(BUDGET_KEY, "contextBudgetTokens") ?? 0;
  const logRequests = row(LOG_KEY, "logRequests");
  const beforeCompactPrompt = row(BEFORE_COMPACT_PROMPT_KEY, "beforeCompactPrompt") ?? "";
  if (typeof mode !== "string" || !MODES.includes(mode as Mode)) {
    throw new SettingsError("無法讀取 compact-adviser 的模式設定；未執行任何操作。");
  }
  if (typeof minimum !== "number" || !Number.isSafeInteger(minimum) || minimum <= 0) {
    throw new SettingsError(
      "無法讀取 compact-adviser 的最小上下文設定；未執行任何操作。",
    );
  }
  if (typeof budget !== "number" || !Number.isSafeInteger(budget) || budget < 0) {
    throw new SettingsError(
      "無法讀取 compact-adviser 的上下文預算設定；未執行任何操作。",
    );
  }
  if (logRequests !== undefined && typeof logRequests !== "boolean") {
    throw new SettingsError(
      "無法讀取 compact-adviser 的請求記錄設定；未執行任何操作。",
    );
  }
  if (typeof beforeCompactPrompt !== "string") {
    throw new SettingsError(
      "無法讀取 compact-adviser 的壓縮前提示詞；未執行任何操作。",
    );
  }
  const profile = row(PROFILE_KEY, "profile");
  parseProfile(profile);
  const consent = parseConsent(consentValue);
  return {
    mode: mode as Mode,
    minContextTokens: minimum,
    contextBudgetTokens: budget,
    autoAcknowledged: consent.autoAcknowledged,
    logRequests: logRequests === true,
    beforeCompactPrompt: beforeCompactPrompt.trim(),
    ...(profile !== undefined ? { profile: profile as string } : {}),
  };
}

/** Menu-saved TypeSafe key from live `/config` rows or the options this module loaded with. */
export function readSavedApiKey(
  rows: readonly ConfigRowLike[],
  loaded: Readonly<Record<string, unknown>> = {},
): string | undefined {
  const value =
    rows.find((candidate) => candidate.key === API_KEY_KEY)?.value ?? loaded.typesafeApiKey;
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function formatTokens(count: number): string {
  return count.toLocaleString("en-US");
}
