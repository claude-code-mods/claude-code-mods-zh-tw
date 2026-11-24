// ABOUTME: The plugin config options the mod sets as environment variables, and the variable each one becomes
// ABOUTME: Option names match plugin.json's userConfig; a missing, blank or mistyped value sets nothing

export const STORED_VARIABLES = [
  { option: 'gemini_api_key', variable: 'GEMINI_API_KEY', title: 'Gemini API 金鑰', sensitive: true },
  { option: 'openai_api_key', variable: 'OPENAI_API_KEY', title: 'OpenAI API 金鑰', sensitive: true },
  { option: 'xai_api_key', variable: 'XAI_API_KEY', title: 'xAI API 金鑰（Grok）', sensitive: true },
  { option: 'perplexity_api_key', variable: 'PERPLEXITY_API_KEY', title: 'Perplexity API 金鑰', sensitive: true },
  { option: 'kimi_api_key', variable: 'KIMI_API_KEY', title: 'Kimi API 金鑰', sensitive: true },
  { option: 'openrouter_api_key', variable: 'OPENROUTER_API_KEY', title: 'OpenRouter API 金鑰', sensitive: true },
  { option: 'openrouter_models', variable: 'OPENROUTER_MODELS', title: 'OpenRouter 模型', sensitive: false },
] as const

export type StoredVariable = (typeof STORED_VARIABLES)[number]['variable']

export type StoredValue = { variable: StoredVariable; value: string }

export function storedValues(options: Record<string, unknown>): StoredValue[] {
  return STORED_VARIABLES.flatMap(({ option, variable }) => {
    const value = typeof options[option] === 'string' ? options[option].trim() : ''
    return value !== '' ? [{ variable, value }] : []
  })
}
