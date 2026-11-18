# FRANCIS AI Website

A responsive Flask + Gemini streaming chat website.

## Run locally

1. Install Python 3.10 or newer.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Set your Gemini API key as an environment variable. Do not paste it into `app.py`, HTML, JavaScript, or GitHub.

   **Windows PowerShell**
   ```powershell
   $env:GEMINI_API_KEY="YOUR_NEW_API_KEY"
   ```

   **Linux / macOS**
   ```bash
   export GEMINI_API_KEY="YOUR_NEW_API_KEY"
   ```

4. Start the app:

   ```bash
   python app.py
   ```

5. Open `http://127.0.0.1:5000`.

## Publish online with Render

1. Create a GitHub repository and upload these project files.
2. In Render, choose **New → Web Service**, then connect the repository.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. In Render's Environment settings, add:
   - `GEMINI_API_KEY` = your Gemini API key
   - `GEMINI_MODEL` = `gemini-2.5-flash`
6. Deploy. Render will provide your public website URL.

`render.yaml` is included as a deployment reference.

## Important security note

If an API key has ever been pasted into a chat, screenshot, public repository, or shared file, revoke/rotate it in Google AI Studio and use a new key as the server environment variable. Never commit `.env` or API keys to GitHub.
