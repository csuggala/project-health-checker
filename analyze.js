export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectDetails } = req.body;

    const systemPrompt = `You are a senior program management expert. Analyze the project and return ONLY valid JSON with this exact structure. No other text, no markdown, no backticks, just the raw JSON object:

{"overall":"RED","overall_reason":"2-3 sentence explanation of overall status","executive_summary":"One crisp sentence suitable for an executive status report","dimensions":{"schedule":{"rag":"RED","label":"Schedule"},"budget":{"rag":"AMBER","label":"Budget"},"resources":{"rag":"GREEN","label":"Resources"},"risks":{"rag":"RED","label":"Risks"},"stakeholders":{"rag":"AMBER","label":"Stakeholders"}},"concerns":[{"text":"Specific concern with recommended action this week"},{"text":"Specific concern with recommended action this week"},{"text":"Specific concern with recommended action this week"}]}

Rules:
- overall must be exactly "RED", "AMBER", or "GREEN"
- All rag values must be exactly "RED", "AMBER", or "GREEN"
- Return raw JSON only, nothing else`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Assess this project:\n\n${projectDetails}` }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `API error ${response.status}: ${errText}` });
    }

    const data = await response.json();

    if (!data.content || data.content.length === 0) {
      return res.status(500).json({ error: 'Empty response from Claude' });
    }

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonStart = clean.indexOf('{');
    const jsonEnd = clean.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(500).json({ error: 'No JSON found in response', raw: clean });
    }

    const jsonStr = clean.substring(jsonStart, jsonEnd + 1);
    const result = JSON.parse(jsonStr);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
