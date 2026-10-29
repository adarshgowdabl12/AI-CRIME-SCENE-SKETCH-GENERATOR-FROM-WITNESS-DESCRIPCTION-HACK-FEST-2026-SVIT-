import getpass
from pathlib import Path


ENV = Path(__file__).resolve().parent / ".env"
key = getpass.getpass("Paste your Gemini API key (hidden): ").strip()
if not key:
    raise SystemExit("No key entered. Nothing changed.")

lines = ENV.read_text().splitlines() if ENV.exists() else []
lines = [
    line for line in lines
    if not line.startswith(("GEMINI_API_KEY=", "OPENAI_API_KEY="))
]
lines.append(f"GEMINI_API_KEY={key}")
ENV.write_text("\n".join(lines) + "\n")
print("Saved to backend/.env (key not displayed).")
