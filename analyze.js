exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { projectDetails } = JSON.parse(event.body);

    const systemPrompt = `You are a senior program management expert. Analyze the project and return ONLY valid JSON with this exact structure:
{
  "overall": "RED",
  "overall_reason": "2-3 sentence explanation of overall status",
  "executive_summary": "One crisp sentence suitable for an executive status report",
  "dimensions": {
    "schedule": {"rag": "RED", "label": "Schedule"},
    "budget": {"rag": "AMBER", "label": "Budget"},
    "resources": {"rag": "GREEN", "label": "Resources"},
    "risks": {"rag": "RED", "label": "Risks"},
    "stakeholders": {"rag": "AMBER", "label": "Stakeholders"}
  },
  "concerns": [
    {"text": "Specific concern with recommended action this week"},
    {"text": "Specific concern with recommended action this week"},
    {"text": "Specific concern with recommended action this week"}
  ]
}
Return ONLY the JSON object. No markdown, no backticks, no preamble.`;

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

    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
