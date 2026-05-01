const { openAiApiKey, openAiModel } = require('./config');

async function generateJson(prompt) {
  if (!openAiApiKey) throw new Error('OPENAI_API_KEY is missing');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenAI error: ${txt}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

module.exports = { generateJson };
