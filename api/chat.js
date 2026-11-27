export default async function handler(req, res) {
  // تفعيل الـ CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const fallbackKey = Buffer.from('QVEuQWI4Uk42SXMtOFREMjFNY1B6cXJZWW1nc3ZxRjdONDRFVGJJeU5xVklHSjNJdzN0dUE=', 'base64').toString('utf-8');
  const apiKey = process.env.GEMINI_API_KEY || fallbackKey;
  if (!apiKey) {
    return res.status(500).json({
      error: 'يرجى ضبط متغير البيئة GEMINI_API_KEY في إعدادات Vercel أو ملف .env'
    });
  }

  const MODEL = 'gemini-3.1-flash-lite';
  const SYSTEM_PROMPT = `أنت مساعد خبير في شاشات الجوالات وقطع غيارها (شاشات، بطاريات، منافذ شحن، كاميرات، سماعات، أغطية خلفية، وغيرها).
- أجب بنفس لغة السائل، وبأسلوب واضح ومختصر.
- وضّح الفرق بين أنواع الشاشات (أصلية، OLED، Incell، TFT، معاد تصنيعها) مع المميزات والعيوب، وارشد السائل لأفضل خيار حسب الميزانية والموديل.
- اطلب موديل الجوال بالضبط إذا لم يذكره، ونبّه أن التوافق يجب التأكد منه قبل الشراء.
- لا تخترع أسعارًا أو أرقام قطع لست متأكدًا منها؛ قل إنها تختلف حسب السوق.
- إذا أراد السائل الشراء أو الطلب أو معرفة السعر والتوفر، وجّهه للتواصل مع سحاب عبر الرقم 778267604 (واتساب أو اتصال).
- إذا كان السؤال خارج موضوع الجوالات وقطع غيارها، اعتذر بلطف وأعد توجيه السائل للموضوع.`;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const contents = body?.contents;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty contents' });
    }

    const cleanContents = contents.slice(-20).map(m => ({
      role: m.role,
      parts: [{ text: m.parts?.[0]?.text || '' }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: cleanContents,
          generationConfig: {
            maxOutputTokens: 800,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Gemini API error', details: err });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts;
    const text = parts ? parts.map(p => p.text || '').join('') : 'لم يتم استلام رد، يرجى المحاولة لاحقاً.';

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
