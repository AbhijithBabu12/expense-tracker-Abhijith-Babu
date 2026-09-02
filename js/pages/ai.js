import { buildFinancialContext } from "../ai/contextBuilder.js";


let isLoading = false;
let abortController = null;
let conversationStarted = false;

/*
 * Conversation memory.
 *
 * Stores the full message history so the AI
 * can reference earlier messages in the chat.
 */
let chatHistory = [];


export function initializeAI() {

    renderAI();

    window.addEventListener(
        "transactionsChanged",
        () => {
            if (!conversationStarted && !isLoading) {
                renderAI();
            }
        }
    );

}


function renderAI() {

    const container =
        document.getElementById("ai-content");

    if (!container) {
        console.warn("AI content container not found.");
        return;
    }

    container.innerHTML = `

        <section class="ai-workspace">     
        
        <div class="ai-chat-toolbar">
    <button
        type="button"
        id="ai-new-chat"
        class="ai-new-chat"
    >
        <span>＋</span>
        New chat
    </button>
</div>
            <main
                id="ai-messages"
                class="ai-messages"
            >

                <div
                    id="ai-empty-state"
                    class="ai-empty-state"
                >

                    <div class="ai-empty-mark">
                        ✦
                    </div>

                    <h2>
                        Understand your money.
                    </h2>

                    <p>
                        Ask Meowth about your spending,
                        income, savings, or financial habits.
                    </p>


                    <div class="ai-suggestion-grid">

                        ${createSuggestion(
                            "Spending",
                            "Where am I overspending?"
                        )}

                        ${createSuggestion(
                            "Categories",
                            "What am I spending the most on?"
                        )}

                        ${createSuggestion(
                            "Monthly",
                            "How is this month going?"
                        )}

                        ${createSuggestion(
                            "Savings",
                            "How can I save more money?"
                        )}

                    </div>

                </div>

            </main>


            <div class="ai-composer-wrapper">

                <form
                    id="ai-form"
                    class="ai-composer"
                >

                    <textarea
                        id="ai-input"
                        rows="1"
                        placeholder="Ask about your finances..."
                        aria-label="Ask Meowth AI"
                    ></textarea>

                    <button
                        type="submit"
                        id="ai-send-button"
                        class="ai-send-button"
                        aria-label="Send message"
                    >
                        ↑
                    </button>

                </form>

                <p class="ai-disclaimer">
                    Meowth AI analyzes verified financial summaries.
                </p>

            </div>

        </section>

    `;

    setupAIEvents();

}


function createSuggestion(label, prompt) {

    return `
        <button
            type="button"
            class="ai-suggestion"
            data-ai-prompt="${escapeHTML(prompt)}"
        >

            <span class="ai-suggestion-label">
                ${escapeHTML(label)}
            </span>

            <span class="ai-suggestion-text">
                ${escapeHTML(prompt)}
            </span>

            <span class="ai-suggestion-arrow">
                →
            </span>

        </button>
    `;

}


function setupAIEvents() {

    const form =
        document.getElementById("ai-form");

    const input =
        document.getElementById("ai-input");

    const sendButton =
        document.getElementById("ai-send-button");

    const newChat =
        document.getElementById("ai-new-chat");


    if (!form || !input) {
        return;
    }


    form.addEventListener(
        "submit",
        handleSubmit
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (!isLoading) {
                    form.requestSubmit();
                }

            }

        }
    );


    input.addEventListener(
        "input",
        autoResizeInput
    );


    document
        .querySelectorAll(".ai-suggestion")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    if (isLoading) {
                        return;
                    }

                    const prompt =
                        button.dataset.aiPrompt;

                    input.value =
                        prompt;

                    autoResizeInput();

                    input.focus();

                    form.requestSubmit();

                }
            );

        });


    if (newChat) {

        newChat.addEventListener(
            "click",
            startNewConversation
        );

    }


    /*
     * Stop generation: clicking the send button
     * while loading aborts the current request.
     */
    if (sendButton) {

        sendButton.addEventListener(
            "click",
            event => {

                if (isLoading && abortController) {
                    event.preventDefault();
                    event.stopPropagation();
                    abortController.abort();
                }

            }
        );

    }

}


async function handleSubmit(event) {

    event.preventDefault();


    if (isLoading) {
        return;
    }


    const input =
        document.getElementById("ai-input");

    if (!input) {
        return;
    }


    const prompt =
        input.value.trim();


    if (!prompt) {
        return;
    }


    conversationStarted = true;

    isLoading = true;


    hideEmptyState();

    addUserMessage(prompt);

    /*
     * Push user message to conversation memory.
     */
    chatHistory.push({
        role: "user",
        content: prompt
    });


    input.value = "";

    autoResizeInput();

    setInputState(true);


    const assistantMessage =
        addAssistantMessage();


    abortController =
        new AbortController();


    try {

        const financialContext =
            buildFinancialContext();


        console.log(
            "AI Request:",
            {
                message: prompt,
                chatHistory: chatHistory.length,
                financialContext
            }
        );


        const response =
            await fetch(
                "/.netlify/functions/ai-chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: prompt,
                        financialContext,
                        chatHistory
                    }),

                    signal:
                        abortController.signal
                }
            );


        if (!response.ok) {

            let errorMessage =
                "AI request failed.";

            try {

                const errorData =
                    await response.json();

                if (errorData?.error) {
                    errorMessage =
                        errorData.error;
                }

            } catch {
                // Ignore JSON parsing errors.
            }

            throw new Error(
                errorMessage
            );

        }


        if (!response.body) {

            throw new Error(
                "The AI response stream is unavailable."
            );

        }


        const fullResponse = await readAIStream(
            response.body,
            assistantMessage
        );

        /*
         * Push assistant response to conversation memory.
         */
        if (fullResponse) {
            chatHistory.push({
                role: "assistant",
                content: fullResponse
            });
        }


    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            /*
             * On abort, finalize whatever partial
             * text was already streamed.
             */
            const partial =
                getStreamedText(assistantMessage);

            if (partial) {
                updateAssistantMessage(
                    assistantMessage,
                    partial + "\n\n*— generation stopped.*"
                );

                chatHistory.push({
                    role: "assistant",
                    content: partial
                });
            } else {
                updateAssistantMessage(
                    assistantMessage,
                    "Generation stopped."
                );
            }

        } else {

            console.error(
                "AI request error:",
                error
            );

            updateAssistantMessage(
                assistantMessage,
                "I couldn't connect to Meowth AI right now. Please try again."
            );

        }

    } finally {

        isLoading = false;

        abortController = null;

        setInputState(false);

        scrollMessagesToBottom();

    }

}


async function readAIStream(
    stream,
    assistantMessage
) {

    const reader =
        stream.getReader();

    const decoder =
        new TextDecoder("utf-8");

    let buffer = "";
    let fullResponse = "";


    try {

        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const lines =
                buffer.split("\n");


            buffer =
                lines.pop() || "";


            for (const line of lines) {

                const trimmed =
                    line.trim();


                if (!trimmed) {
                    continue;
                }


                if (
                    trimmed ===
                    "data: [DONE]"
                ) {

                    continue;
                }


                if (
                    !trimmed.startsWith(
                        "data:"
                    )
                ) {

                    continue;
                }


                const jsonText =
                    trimmed.slice(5).trim();


                try {

                    const data =
                        JSON.parse(jsonText);


                    const content =
                        data
                            ?.choices?.[0]
                            ?.delta
                            ?.content;


                    if (!content) {
                        continue;
                    }


                    fullResponse +=
                        content;


                    updateStreamingMessage(
                        assistantMessage,
                        fullResponse
                    );


                    /*
                     * This is what creates the
                     * ChatGPT-style live scrolling.
                     */

                    scrollMessagesToBottom();

                } catch (error) {

                    console.warn(
                        "Could not parse AI stream chunk:",
                        error
                    );

                }

            }

        }

    } finally {

        reader.releaseLock();

    }


    /*
     * Render the final response using
     * our Markdown renderer.
     */

    if (fullResponse) {

        updateAssistantMessage(
            assistantMessage,
            fullResponse
        );

    }

    return fullResponse;

}


function addUserMessage(message) {

    const container =
        document.getElementById(
            "ai-messages"
        );

    if (!container) {
        return;
    }


    const element =
        document.createElement("div");


    element.className =
        "ai-message ai-message-user";


    element.innerHTML = `
        <div class="ai-message-bubble">
            ${escapeHTML(message)}
        </div>
    `;


    container.appendChild(
        element
    );


    scrollMessagesToBottom();

}


function addAssistantMessage() {

    const container =
        document.getElementById(
            "ai-messages"
        );


    const element =
        document.createElement("div");


    element.className =
        "ai-message ai-message-assistant";


    element.innerHTML = `
        <div class="ai-avatar">
            ✦
        </div>

        <div class="ai-message-content">

            <span class="ai-message-label">
                Meowth AI
            </span>

            <div class="ai-response ai-streaming">
                <span class="ai-cursor"></span>
            </div>

        </div>
    `;


    container.appendChild(
        element
    );


    scrollMessagesToBottom();


    return element;

}


function updateStreamingMessage(
    element,
    message
) {

    const response =
        element.querySelector(
            ".ai-response"
        );


    if (!response) {
        return;
    }


    /*
     * During streaming we use textContent.
     *
     * This prevents incomplete Markdown from
     * producing broken HTML while tokens arrive.
     */

    response.textContent =
        message;


    response.classList.add(
        "ai-streaming"
    );


    addStreamingCursor(
        response
    );

}


function addStreamingCursor(
    response
) {

    let cursor =
        response.querySelector(
            ".ai-cursor"
        );


    if (!cursor) {

        cursor =
            document.createElement(
                "span"
            );

        cursor.className =
            "ai-cursor";

        response.appendChild(
            cursor
        );

    }

}


/*
 * Extract whatever raw text has been streamed
 * so far from the assistant message element.
 */
function getStreamedText(element) {

    const response =
        element.querySelector(
            ".ai-response"
        );

    if (!response) {
        return "";
    }

    /*
     * Clone and remove the cursor so we only
     * get the actual streamed content.
     */
    const clone = response.cloneNode(true);

    const cursor = clone.querySelector(".ai-cursor");

    if (cursor) {
        cursor.remove();
    }

    return clone.textContent.trim();

}


function updateAssistantMessage(
    element,
    message
) {

    const content =
        element.querySelector(
            ".ai-message-content"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `
        <span class="ai-message-label">
            Meowth AI
        </span>

        <div class="ai-response">
            ${renderMarkdown(message)}
        </div>
    `;


    scrollMessagesToBottom();

}


function hideEmptyState() {

    const emptyState =
        document.getElementById(
            "ai-empty-state"
        );


    if (emptyState) {

        emptyState.remove();

    }

}


function startNewConversation() {

    /*
     * If generation is in progress, abort it first.
     */
    if (isLoading && abortController) {
        abortController.abort();
        isLoading = false;
        abortController = null;
    }


    conversationStarted =
        false;

    /*
     * Clear conversation memory.
     */
    chatHistory = [];


    renderAI();


    const input =
        document.getElementById(
            "ai-input"
        );


    if (input) {
        input.focus();
    }

}


function setInputState(
    disabled
) {

    const input =
        document.getElementById(
            "ai-input"
        );

    const button =
        document.getElementById(
            "ai-send-button"
        );


    if (input) {

        input.disabled =
            disabled;

    }


    if (button) {

        /*
         * While loading, the button becomes a
         * "stop" button. It is never disabled
         * so the user can always click it.
         */
        if (disabled) {
            button.disabled = false;
            button.innerHTML = "■";
            button.setAttribute(
                "aria-label",
                "Stop generation"
            );
        } else {
            button.disabled = false;
            button.innerHTML = "↑";
            button.setAttribute(
                "aria-label",
                "Send message"
            );
        }

    }

}


function autoResizeInput() {

    const input =
        document.getElementById(
            "ai-input"
        );


    if (!input) {
        return;
    }


    input.style.height =
        "auto";


    input.style.height =
        `${Math.min(
            input.scrollHeight,
            140
        )}px`;

}


function scrollMessagesToBottom() {

    const container =
        document.getElementById(
            "ai-messages"
        );


    if (!container) {
        return;
    }


    container.scrollTo({
        top:
            container.scrollHeight,
        behavior:
            "auto"
    });

}


function renderMarkdown(markdown) {

    let html =
        escapeHTML(markdown);


    /*
     * Tables
     */

    html = html.replace(
        /((?:\|.*\|\n)+)/g,
        match => {

            const lines =
                match
                    .trim()
                    .split("\n")
                    .map(line =>
                        line.trim()
                    )
                    .filter(Boolean);


            if (lines.length < 2) {
                return match;
            }


            const rows =
                lines
                    .filter(line =>
                        !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line)
                    )
                    .map(line => {

                        return line
                            .replace(
                                /^\||\|$/g,
                                ""
                            )
                            .split("|")
                            .map(cell =>
                                cell.trim()
                            );

                    });


            if (!rows.length) {
                return match;
            }


            const header =
                rows[0];

            const body =
                rows.slice(1);


            return `
                <div class="ai-table-wrapper">

                    <table class="ai-table">

                        <thead>

                            <tr>
                                ${header.map(cell => `
                                    <th>
                                        ${cell}
                                    </th>
                                `).join("")}
                            </tr>

                        </thead>

                        <tbody>

                            ${body.map(row => `
                                <tr>
                                    ${row.map(cell => `
                                        <td>
                                            ${cell}
                                        </td>
                                    `).join("")}
                                </tr>
                            `).join("")}

                        </tbody>

                    </table>

                </div>
            `;

        }
    );


    /*
     * Bold
     */

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    /*
     * Italic
     */

    html = html.replace(
        /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
        "<em>$1</em>"
    );


    /*
     * Headings
     */

    html = html.replace(
        /^### (.+)$/gm,
        "<h4>$1</h4>"
    );

    html = html.replace(
        /^## (.+)$/gm,
        "<h3>$1</h3>"
    );

    html = html.replace(
        /^# (.+)$/gm,
        "<h2>$1</h2>"
    );


    /*
     * Numbered lists
     */

    html = html.replace(
        /(?:^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g,
        match => {

            const items =
                match
                    .trim()
                    .split("\n")
                    .map(line =>
                        line.replace(
                            /^\d+\.\s+/,
                            ""
                        )
                    );


            return `
                <ol>
                    ${items.map(item => `
                        <li>${item}</li>
                    `).join("")}
                </ol>
            `;

        }
    );


    /*
     * Bullet lists
     */

    html = html.replace(
        /(?:^|\n)((?:[-*]\s+.+(?:\n|$))+)/g,
        match => {

            const items =
                match
                    .trim()
                    .split("\n")
                    .map(line =>
                        line.replace(
                            /^[-*]\s+/,
                            ""
                        )
                    );


            return `
                <ul>
                    ${items.map(item => `
                        <li>${item}</li>
                    `).join("")}
                </ul>
            `;

        }
    );


    /*
     * Paragraphs
     */

    html =
        html
            .split(/\n{2,}/)
            .map(block => {

                block =
                    block.trim();


                if (!block) {
                    return "";
                }


                if (
                    block.startsWith("<h") ||
                    block.startsWith("<ul") ||
                    block.startsWith("<ol") ||
                    block.startsWith("<div")
                ) {

                    return block;

                }


                return `
                    <p>
                        ${block.replace(
                            /\n/g,
                            "<br>"
                        )}
                    </p>
                `;

            })
            .join("");


    return html;

}


function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}