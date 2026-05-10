export type AiProviderKind = 'mock' | 'claude' | 'openai' | 'ollama';

export type AiProviderStatus = 'connected' | 'disconnected' | 'error';

export interface AiProvider {
  id: string;
  kind: AiProviderKind;
  label: string;
  model: string;
  status: AiProviderStatus;
  lastCheckedAt?: string;
}
