// Cloudflare Worker: يخبّي مفتاح Gemini ويستقبل أسئلة الواجهة
// المتغيّرات المطلوبة من لوحة Cloudflare (Settings -> Variables):
//   GEMINI_API_KEY  (Secret)  مفتاح Gemini من Google AI Studio
//   ALLOWED_ORIGIN  (Text)    اختياري: رابط موقعك فقط (اتركه "*" أو فاضي أثناء التجربة)

const MODEL = "gemini-3.1-flash-lite";

// تعليمات المساعد
const SYSTEM_PROMPT = `أنت مساعد خبير في شاشات الجوالات وقطع غيارها (شاشات، بطاريات، منافذ شحن، كاميرات، سماعات، أغطية خلفية، وغيرها) لمركز "سحاب".
- أجب بنفس لغة ولهجة السائل، وبأسلوب واضح ومختصر ومباشر.
- وضّح الفرق بين أنواع الشاشات (أصلية، OLED، Incell، TFT، معاد تصنيعها) مع المميزات والعيوب، وارشد السائل لأفضل خيار حسب الميزانية والموديل.
- اطلب موديل الجوال بالضبط إذا لم يذكره لتحديد التوافق والسعر بدقة.
- بخصوص الأسعار: عند سؤال السائل عن السعر، قدّم تقديراً سعرياً تقريبياً بناءً على فئة القطعة وجودتها ونوع الجوال (بالريال السعودي أو الدولار أو الريال اليمني حسب الاستفسار)، ووضّح الفارق بين سعر التجاري والاقتصادي (Incell) والمتوسط (OLED) والأصلي.
- نبّه دائماً بلطف أن "الأسعار تقريبية وقابلة للتغيير حسب الموديل الدقيق وتغيرات سعر الصرف والسوق"، ولتأكيد السعر النهائي والتوفر، وجّهه للتواصل مباشرة مع سحاب عبر الرقم 778267604 (واتساب أو اتصال).
- إذا كان السؤال خارج موضوع الجوالات وقطع غيارها، اعتذر بلطف وأعد توجيه السائل للموضوع.`;

const MAX_TURNS = 30;        // أقصى عدد رسائل في المحادثة
const MAX_CHARS = 2000;      // أقصى طول للرسالة الواحدة

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed === "*" ? "*" : allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, cors);
    if (allowed !== "*" && origin !== allowed) return reply({ error: "Forbidden" }, 403, cors);
    if (!env.GEMINI_API_KEY) return reply({ error: "Missing GEMINI_API_KEY" }, 500, cors);

    let body;
    try { body = await request.json(); } catch { return reply({ error: "Bad JSON" }, 400, cors); }

    // تنظيف المحادثة
    const raw = Array.isArray(body.contents) ? body.contents.slice(-MAX_TURNS) : [];
    const contents = raw
      .filter(m => m && (m.role === "user" || m.role === "model") && m.parts && typeof m.parts[0]?.text === "string")
      .map(m => ({ role: m.role, parts: [{ text: m.parts[0].text.slice(0, MAX_CHARS) }] }));
    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return reply({ error: "Empty question" }, 400, cors);
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }),
      }
    );
    if (!r.ok) {
      const err = await r.text();
      return reply({ error: "Gemini error", details: err }, 502, cors);
    }

    const j = await r.json();
    const parts = j.candidates?.[0]?.content?.parts;
    const text = parts ? parts.map(p => p.text || "").join("") : "ما وصل رد. جرّب صياغة ثانية للسؤال.";
    return reply({ text }, 200, cors);
  },
};

function reply(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
