# Chat with pdf

A Frankenstein project to try out a bunch of interesting technologies at once.

This is a AI chatbot powered by [Google Generative AI](https://ai.google.dev/) API where you can upload a PDF file as the bots context and chat with it to extract information the file.

## Key technologies used

- **Deno:** Backend runtime for secure and modern JavaScript/TypeScript development.
- **Hono:** Lightweight web framework for creating HTTP and WebSocket endpoints.
- **HTMX:** For building an interactive frontend with minimal JavaScript.
- **Tailwind CSS:** For styling the user interface efficiently.

## Limitations

Due to deno deploy not allowing disk access to store the uploaded files, the context is stored in memory. Thats why I had to limit the application to only accepting files up to 50kb and only 5 concurrent chat sessions to avoid crashes.

## Deployment

The application is deployed at Deno deploy.

[Live Demo](https://chat-with-pdf-labib2003.deno.dev/)
