const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { client, firstName, estNum, account, project, po, lines, subtotal } = JSON.parse(event.body);

    const linesSummary = lines.map((l, i) =>
      `${i + 1}. ${l.service || 'Service'}${l.desc ? ' — ' + l.desc : ''} | Qty: ${l.qty} | Rate: $${l.rate} | Total: $${(l.qty * l.rate).toFixed(2)}`
    ).join('\n');

    const prompt = `You are writing a professional, warm client-facing email on behalf of HANDS Logistics, a premium experiential marketing and brand activation logistics company based in Las Vegas.

Write a concise, polished covering note (3-5 sentences max) to go at the top of an estimate email. The email will also include a full estimate PDF, so DO NOT list line items or totals — just write the warm intro paragraph.

Details:
- Client first name: ${firstName || client}
- Account: ${account || 'N/A'}
- Project: ${project || 'N/A'}
- Estimate #: ${estNum}
- Estimate total: $${subtotal}

Tone: Professional, confident, warm. HANDS brand voice is premium but approachable. Do NOT start with "I hope this email finds you well." Do NOT use generic filler phrases.

Return ONLY the paragraph text, no subject line, no sign-off, no extra formatting.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const emailBody = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emailBody })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
