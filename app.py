import os
import json
from flask import Flask, render_template, request, Response, stream_with_context, jsonify
from google import genai
from google.genai import types

app = Flask(__name__)

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
API_KEY = os.getenv("GEMINI_API_KEY")

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/health")
def health():
    return jsonify({"ok": True, "model": MODEL})

@app.post("/chat")
def chat():
    if not API_KEY:
        return jsonify({"error": "The server owner has not configured GEMINI_API_KEY yet."}), 503

    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages", [])
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "Please send a message first."}), 400

    # Keep only valid, recent text messages to limit accidental oversized requests.
    contents = []
    for item in messages[-20:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        text = item.get("text")
        if role not in ("user", "model") or not isinstance(text, str):
            continue
        text = text.strip()[:12000]
        if text:
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))

    if not contents or contents[-1].role != "user":
        return jsonify({"error": "The last message must be from the user."}), 400

    client = genai.Client(api_key=API_KEY)

    @stream_with_context
    def generate():
        try:
            for chunk in client.models.generate_content_stream(
                model=MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "You are FRANCIS AI, a helpful, clear, friendly assistant. "
                        "Answer in the language the user uses. When writing code, use "
                        "proper fenced code blocks and explain where code belongs when useful."
                    ),
                    temperature=0.7,
                ),
            ):
                if chunk.text:
                    yield "data: " + json.dumps({"text": chunk.text}, ensure_ascii=False) + "\n\n"
            yield "data: " + json.dumps({"done": True}) + "\n\n"
        except Exception as exc:
            # Do not expose credentials or internal tracebacks to the browser.
            app.logger.exception("Gemini streaming request failed")
            yield "data: " + json.dumps({"error": "AI request failed. Check the server logs and API configuration."}) + "\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
