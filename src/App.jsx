import { useState, useRef, useEffect } from "react";

const API_URL = "https://text.pollinations.ai/openai";

const SYSTEM_QUESTION = `You are a prompt engineering expert helping a user craft the perfect AI prompt. 

Your job is to ask ONE focused follow-up question at a time to gather the information needed to write an excellent prompt. Cover areas like: tone, audience, format/length, specific constraints, examples, context, or goal.

Specialties: General, Creative Writing, Coding & Technical, Business & Productivity, Engineering & Academic Writing.

Rules:
- Ask ONLY ONE question per response. No lists. No preamble. Just the question.
- Keep questions short and conversational.
- After 3–4 exchanges (when you have enough to write a great prompt), respond with exactly: READY

Do not explain yourself. Do not say anything except the question or READY.`;

const SYSTEM_GENERATE = `You are a world-class prompt engineer. Based on the user's goal and the context gathered through follow-up questions, write the single best prompt possible.

Specialties: General, Creative Writing, Coding & Technical, Business & Productivity, Engineering & Academic Writing.

Rules:
- Output ONLY the final prompt. No explanation, no preamble, no quotes around it.
- The prompt should be clear, specific, and optimised for an AI chat assistant.
- Use proven techniques: role assignment, context, format instructions, constraints, examples if relevant.
- Make it ready to paste directly into an AI chat.`;

async function callClaude(systemPrompt, messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export default function PromptCreator() {
  const [stage, setStage] = useState("idle"); // idle | questioning | generating | done
  const [idea, setIdea] = useState("");
  const [chat, setChat] = useState([]); // [{role, content}]
  const [currentQ, setCurrentQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentQ, finalPrompt, stage]);

  async function startFlow() {
    if (!idea.trim()) return;
    setStage("questioning");
    setLoading(true);
    const userMsg = { role: "user", content: `I want to create a prompt for: ${idea.trim()}` };
    const msgs = [userMsg];
    const reply = await callClaude(SYSTEM_QUESTION, msgs);
    setChat(msgs);
    setCurrentQ(reply.trim());
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    const newChat = [
      ...chat,
      { role: "assistant", content: currentQ },
      { role: "user", content: answer.trim() },
    ];
    setChat(newChat);
    setAnswer("");

    const reply = await callClaude(SYSTEM_QUESTION, newChat);

    if (reply.trim() === "READY") {
      setStage("generating");
      setCurrentQ("");
      const prompt = await callClaude(SYSTEM_GENERATE, newChat);
      setFinalPrompt(prompt.trim());
      setStage("done");
    } else {
      setCurrentQ(reply.trim());
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      stage === "idle" ? startFlow() : submitAnswer();
    }
  }

  function copy() {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setStage("idle"); setIdea(""); setChat([]); setCurrentQ("");
    setAnswer(""); setFinalPrompt(""); setCopied(false); setLoading(false);
  }

  const qaHistory = [];
  for (let i = 1; i < chat.length; i += 2) {
    if (chat[i] && chat[i + 1]) {
      qaHistory.push({ q: chat[i].content, a: chat[i + 1].content });
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem 1rem", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e2e8f0"
    }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✦</div>
          <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 700, background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Prompt Creator
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
            Describe your idea — we'll craft the perfect prompt together.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1.25rem", padding: "2rem", backdropFilter: "blur(10px)"
        }}>

          {/* Idle stage */}
          {stage === "idle" && (
            <div>
              <label style={{ display: "block", marginBottom: "0.6rem", fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>
                What do you want to prompt an AI for?
              </label>
              <textarea
                ref={inputRef}
                value={idea}
                onChange={e => setIdea(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. I want to ask an AI to help me write a technical report on renewable energy..."
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.75rem",
                  padding: "0.85rem 1rem", color: "#e2e8f0", fontSize: "0.95rem",
                  resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6
                }}
              />
              <button onClick={startFlow} disabled={!idea.trim()} style={{
                marginTop: "1rem", width: "100%", padding: "0.85rem",
                background: idea.trim() ? "linear-gradient(90deg, #818cf8, #c084fc)" : "rgba(255,255,255,0.08)",
                border: "none", borderRadius: "0.75rem", color: idea.trim() ? "#fff" : "#64748b",
                fontWeight: 600, fontSize: "1rem", cursor: idea.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}>
                Let's build your prompt →
              </button>
            </div>
          )}

          {/* Questioning stage */}
          {(stage === "questioning" || stage === "generating") && (
            <div>
              {/* Original idea */}
              <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "rgba(129,140,248,0.1)", borderRadius: "0.6rem", borderLeft: "3px solid #818cf8" }}>
                <span style={{ fontSize: "0.78rem", color: "#818cf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your idea</span>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.9rem", color: "#cbd5e1" }}>{idea}</p>
              </div>

              {/* Q&A history */}
              {qaHistory.map((item, i) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "#c084fc", fontWeight: 600 }}>Q</span>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>{item.q}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>A</span>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#e2e8f0" }}>{item.a}</p>
                  </div>
                </div>
              ))}

              {/* Current question */}
              {loading && stage === "questioning" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Thinking...
                </div>
              )}
              {loading && stage === "generating" && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "1rem" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", animation: "pulse 1.5s ease-in-out infinite" }}>✦</div>
                  Crafting your prompt...
                </div>
              )}

              {currentQ && !loading && (
                <div>
                  <div style={{ marginBottom: "0.75rem", padding: "0.75rem 1rem", background: "rgba(192,132,252,0.08)", borderRadius: "0.6rem", borderLeft: "3px solid #c084fc" }}>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "#e2e8f0", lineHeight: 1.6 }}>{currentQ}</p>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Your answer..."
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.75rem",
                      padding: "0.85rem 1rem", color: "#e2e8f0", fontSize: "0.95rem",
                      resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6
                    }}
                  />
                  <button onClick={submitAnswer} disabled={!answer.trim()} style={{
                    marginTop: "0.75rem", width: "100%", padding: "0.8rem",
                    background: answer.trim() ? "linear-gradient(90deg, #818cf8, #c084fc)" : "rgba(255,255,255,0.08)",
                    border: "none", borderRadius: "0.75rem", color: answer.trim() ? "#fff" : "#64748b",
                    fontWeight: 600, fontSize: "0.95rem", cursor: answer.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s"
                  }}>
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Done stage */}
          {stage === "done" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.1rem" }}>✦</span>
                <span style={{ fontWeight: 700, fontSize: "1rem", background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Your prompt is ready
                </span>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(129,140,248,0.3)",
                borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1rem",
                fontSize: "0.95rem", lineHeight: 1.75, color: "#e2e8f0", whiteSpace: "pre-wrap"
              }}>
                {finalPrompt}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={copy} style={{
                  flex: 2, padding: "0.85rem",
                  background: copied ? "rgba(52,211,153,0.2)" : "linear-gradient(90deg, #818cf8, #c084fc)",
                  border: copied ? "1px solid #34d399" : "none",
                  borderRadius: "0.75rem", color: copied ? "#34d399" : "#fff",
                  fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s"
                }}>
                  {copied ? "✓ Copied!" : "Copy Prompt"}
                </button>
                <button onClick={reset} style={{
                  flex: 1, padding: "0.85rem", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem",
                  color: "#94a3b8", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer"
                }}>
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        textarea:focus { border-color: rgba(129,140,248,0.5) !important; box-shadow: 0 0 0 3px rgba(129,140,248,0.1); }
      `}</style>
    </div>
  );
}