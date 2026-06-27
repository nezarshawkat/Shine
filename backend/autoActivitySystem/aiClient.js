const { openAiApiKey, openAiModel, openAiSearchModel } = require('./config');

function parseJsonContent(content) {
  const value = String(content || '').trim();
  try {
    return JSON.parse(value);
  } catch {
    const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const object = fenced || value.slice(value.indexOf('{'), value.lastIndexOf('}') + 1);
    return JSON.parse(object);
  }
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function citationSources(annotations = []) {
  const sources = annotations
    .map((annotation) => annotation?.url_citation || annotation)
    .filter((citation) => citation?.type === 'url_citation' || citation?.url)
    .filter((citation) => validHttpUrl(citation.url))
    .map((citation) => ({
      name: String(citation.title || new URL(citation.url).hostname).trim(),
      link: citation.url,
    }));

  return [...new Map(sources.map((source) => [source.link, source])).values()].slice(0, 8);
}

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
  return parseJsonContent(data.choices?.[0]?.message?.content || '{}');
}

async function generateSourcedJson(prompt) {
  if (!openAiApiKey) throw new Error('OPENAI_API_KEY is missing');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: openAiSearchModel,
      web_search_options: { search_context_size: 'medium' },
      messages: [
        {
          role: 'system',
          content: 'Search the live web before answering. Ground every factual claim in the pages you use. Return valid JSON only, without markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || JSON.stringify(data);
    throw new Error(`OpenAI web search error: ${message}`);
  }

  const message = data.choices?.[0]?.message;
  const sources = citationSources(message?.annotations);
  if (!sources.length) throw new Error('OpenAI web search returned no cited sources');
  return { json: parseJsonContent(message?.content || '{}'), sources };
}

module.exports = { generateJson, generateSourcedJson };
