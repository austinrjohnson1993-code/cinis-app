const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function coachingMessage(messages, systemPrompt) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });
  return response.content[0].text;
}

async function lightweightMessage(messages, systemPrompt) {
  const response = await client.messages.create({
    model: 'claude-haiku-20240307',
    max_tokens: 512,
    system: systemPrompt,
    messages: messages,
  });
  return response.content[0].text;
}

module.exports = { coachingMessage, lightweightMessage };
