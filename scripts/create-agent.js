import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
const agentName = process.env.FOUNDRY_AGENT_NAME;
const modelDeployment = process.env.FOUNDRY_MODEL_DEPLOYMENT;
const agentInstructions = process.env.FOUNDRY_AGENT_INSTRUCTIONS || 'Eres un asistente útil.';

if (!projectEndpoint || !agentName || !modelDeployment) {
  console.error('Faltan variables de entorno: FOUNDRY_PROJECT_ENDPOINT, FOUNDRY_AGENT_NAME y FOUNDRY_MODEL_DEPLOYMENT.');
  process.exit(1);
}

const client = new AIProjectClient(projectEndpoint, new DefaultAzureCredential());
const openai = client.getOpenAIClient();

const existingAgents = await openai.agents.list();
const found = existingAgents.data?.find((agent) => agent.name === agentName);

if (found) {
  console.log(`El agente "${agentName}" ya existe.`);
  process.exit(0);
}

const created = await openai.agents.create({
  name: agentName,
  model: modelDeployment,
  instructions: agentInstructions,
});

console.log(`Agente creado: ${created.name || agentName}`);
