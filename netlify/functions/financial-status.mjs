const GROQ_API_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

export default async (req) => {

    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: CORS_HEADERS
        });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: CORS_HEADERS
            }
        );
    }

    try {

        // Dedicated API key for the dashboard AI flash status card
        const apiKey =
            process.env.AI_FLASH_CARD ||
            process.env.GROQ_API_KEY ||
            process.env.GROQ_GPT;

        if (!apiKey) {
            console.error("[financial-status] No API key available in process.env");
            return new Response(
                JSON.stringify({ error: "AI API key not configured on Netlify environment" }),
                {
                    status: 500,
                    headers: CORS_HEADERS
                }
            );
        }

        const body =
            await req.json().catch(() => ({}));

        const financialContext =
            body.financialContext || {};

        const refreshSeed =
            body.refreshSeed || Date.now();

        const systemPrompt =
            `You are Meowth AI, a financial status analyzer. Review the verified financial context provided and output exactly two parts separated by a pipe character (|):
HEADLINE | DETAIL

STRICT FORMATTING RULES:
1. HEADLINE: 1 punchy, natural sentence (max 8 words) summarizing their current standing (e.g. "Healthy cash flow with steady savings." or "Expenses are outpacing your earnings.").
2. DETAIL: 1 helpful, concrete sentence (max 22 words) highlighting their top spending category or savings percentage with friendly advice.
3. Use Indian Rupee (₹) symbol if mentioning currency amounts.
4. Output ONLY "HEADLINE | DETAIL" without quotation marks, bullet points, asterisks, or extra text.`;

        const userPrompt =
            `Financial context: ${JSON.stringify(financialContext)} [seed: ${refreshSeed}]`;

        const groqResponse =
            await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-20b",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.75,
                    max_tokens: 600
                })
            });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error("Groq status error:", groqResponse.status, errText);
            return new Response(
                JSON.stringify({ error: "Failed to generate AI status", detail: errText }),
                {
                    status: 502,
                    headers: CORS_HEADERS
                }
            );
        }

        const data =
            await groqResponse.json();

        const rawContent =
            data.choices?.[0]?.message?.content?.trim() || "";

        let headline = "";
        let detail = "";

        if (rawContent.includes("|")) {
            const parts = rawContent.split("|");
            headline = parts[0].replace(/^[#*"\s]+|[#*"\s]+$/g, "").trim();
            detail = parts[1].replace(/^[#*"\s]+|[#*"\s]+$/g, "").trim();
        } else {
            headline = rawContent;
            detail = "";
        }

        return new Response(
            JSON.stringify({
                headline,
                detail
            }),
            {
                status: 200,
                headers: CORS_HEADERS
            }
        );

    } catch (err) {
        console.error("Financial status exception:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                status: 500,
                headers: CORS_HEADERS
            }
        );
    }

};
