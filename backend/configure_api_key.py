import getpass
from pathlib import Path


ENV = Path(__file__).resolve().parent / ".env"
key = getpass.getpass("Paste your NEW OpenAI API key (hidden): ").strip()
if not key:
    raise SystemExit("No key entered. Nothing changed.")

lines = ENV.read_text().splitlines() if ENV.exists() else []
lines = [line for line in lines if not line.startswith("OPENAI_API_KEY=")]
lines.append(f"OPENAI_API_KEY={key}")
ENV.write_text("\n".join(lines) + "\n")
print("Saved to backend/.env (key not displayed).")
