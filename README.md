# FlipOS

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

To use the AI features powered by Google Gemini, you need to set up a `GOOGLE_API_KEY` environment variable.

1.  **Local Development:**
    Create a `.env` file in the root of your project and add your API key:
    ```
    GOOGLE_API_KEY=your_google_api_key_here
    ```
    This file is listed in `.gitignore` and should not be committed to your repository.

2.  **Production (Firebase App Hosting):**
    You MUST configure the `GOOGLE_API_KEY` in your Firebase App Hosting backend's environment variable settings.
    - Go to your Firebase project in the Firebase Console.
    - Navigate to "App Hosting".
    - Select your backend.
    - Go to the "Settings" or "Environment variables" section.
    - Add `GOOGLE_API_KEY` with its value.

    Ensure the API key has the necessary permissions in your Google Cloud project to use the Generative Language API (for Gemini models).

### Etsy Integration

To use the Etsy integration features, you need to set up an `ETSY_API_KEY` environment variable.

1.  **Local Development:**
    Add your Etsy API key to your `.env` file:
    ```
    ETSY_API_KEY=your_etsy_api_key_here
    ```

2.  **Production (Firebase App Hosting):**
    Configure the `ETSY_API_KEY` in your Firebase App Hosting backend's environment variable settings, just like you did for the `GOOGLE_API_KEY`.
