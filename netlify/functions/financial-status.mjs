const GROQ_API_URL =
    "https://api.groq.com/openai/v1/chat/completions";

export default async (req) => {

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: { "Content-Type": "application/json" }
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
            return new Response(
                JSON.stringify({ error: "AI_FLASH_CARD API key not configured" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const body =
            await req.json();

        const financialContext =
            body.financialContext || {};

        const systemPrompt =
            `You are Meowth AI, a financial status analyzer. Review the verified financial context provided and output exactly two parts separated by a pipe character (|):
HEADLINE | DETAIL

STRICT FORMATTING RULES:
1. HEADLINE: 1 punchy, natural sentence (max 8 words) summarizing their current standing (e.g. "Healthy cash flow with steady savings." or "Expenses are outpacing your earnings.").
2. DETAIL: 1 helpful, concrete sentence (max 22 words) highlighting their top spending category or savings percentage with friendly advice.
3. Use Indian Rupee (₹) symbol if mentioning currency amounts.
4. Output ONLY "HEADLINE | DETAIL" without quotation marks, bullet points, asterisks, or extra text.`;

        const userPrompt =
            `Financial context: ${JSON.stringify(financialContext)}`;

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
                    temperature: 0.3,
                    max_tokens: 600
                })
            });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error("Groq status error:", groqResponse.status, errText);
            return new Response(
                JSON.stringify({ error: "Failed to generate AI status" }),
                {
                    status: 502,
                    headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
            }
        );

    } catch (err) {
        console.error("Financial status exception:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }

};
