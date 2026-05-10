import type { LibraryHome } from '@home-archive/shared';

export const fallbackLibrary: LibraryHome = {
  householdName: '우리집',
  recentPhotos: [],
  highlights: [],
  family: [],
  providers: [
    {
      id: 'claude-default',
      kind: 'claude',
      label: 'Claude',
      model: 'claude-opus-4-7',
      status: 'disconnected'
    },
    {
      id: 'openai-default',
      kind: 'openai',
      label: 'GPT',
      model: 'gpt-4o',
      status: 'disconnected'
    },
    {
      id: 'ollama-local',
      kind: 'ollama',
      label: 'Ollama (로컬)',
      model: 'llama3.2',
      status: 'disconnected'
    }
  ],
  timelineMonths: []
};
