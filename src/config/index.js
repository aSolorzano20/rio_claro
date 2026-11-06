import crypto from 'node:crypto';
import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

export const config = {
  port: Number(process.env.PORT) || 3000,
  demoMode: process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false',
  projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
  agentName: process.env.FOUNDRY_AGENT_NAME,
  jwtSecret: process.env.JWT_SECRET
    || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(48).toString('base64url')),
};

if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

const credential = new DefaultAzureCredential();
export const openaiClient = config.projectEndpoint
  ? new AIProjectClient(config.projectEndpoint, credential).getOpenAIClient()
  : null;
