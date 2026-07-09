import { api } from '../api/client';

export async function warmupAiService(onStatus) {
  onStatus?.('Starting AI service — this can take up to 60 seconds on Render free tier...');

  const result = await api.warmupAi();

  if (!result.ready) {
    throw new Error(
      result.message ||
        'AI service did not wake up in time. Wait 30 seconds and try again.'
    );
  }

  return result;
}
