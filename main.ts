import { Hono } from "@hono/hono";
import { serveStatic, upgradeWebSocket } from "@hono/hono/deno";
import { crypto } from "@std/crypto";
import fileToGenerativePart from "./utils/fileToGenerativePart.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import initiateChat from "./utils/initiateChat.ts";

const app = new Hono();
const genAI = new GoogleGenerativeAI(Deno.env.get("API_KEY")!);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    candidateCount: 1, // Generate only one response to speed up generation
    temperature: 0.3, // Lower creativity for more factual responses
    topP: 0.8, // Sample from more likely token outputs
  },
});
let inMemoryDb: {
  chatId: string;
  context: { inlineData: { data: string; mimeType: string } };
}[] = [];

app.use("/*", serveStatic({ root: "./public" }));

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const chatId = c.req.query("chatId");
    const chatData = inMemoryDb.find((c) => c.chatId === chatId) ?? {
      chatId,
      context: { inlineData: { data: "", mimeType: "" } },
    };
    const { context } = chatData;

    const chat = model.startChat({
      history: initiateChat(context),
    });

    return {
      onOpen(_e, ws) {
        ws.send(`
          <div hx-swap-oob="beforeend:#chat">
            <p class="text-center text-white">
              A new chat session has started with a
              fresh history.
            </p>
          </div>
        `);
      },

      async onMessage(event, ws) {
        const req = JSON.parse(event.data.toString());
        const messageId = crypto.randomUUID();

        ws.send(`
          <div hx-swap-oob="beforeend:#chat">
            <div>
              <div class="text-end">
                <div id="prompt-${messageId}" class="inline-block bg-blue-500 text-white p-3 rounded-lg rounded-br-none max-w-[75%]">
                  ${req.prompt}
                </div>
              </div>

              <div class="text-start mt-2" >
                <div class="inline-block bg-gray-600 text-white p-3 rounded-lg rounded-bl-none max-w-[75%]">
                  <md-block id="response-${messageId}" class="animate-pulse">AI is thinking...</md-block>
                </div>
              </div>
            </div>
          </div>
        `);

        try {
          const result = await chat.sendMessageStream(req.prompt);
          const chunks = [];
          ws.send(`<md-block id="response-${messageId}"></md-block>`);

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            chunks.push(chunkText);
            ws.send(
              `<md-block hx-swap-oob="beforeend:#response-${messageId}">${chunkText}</md-block>`,
            );
          }

          const finalResponse = chunks.join("");
          ws.send(
            `<md-block id="response-${messageId}">${finalResponse}</md-block>`,
          );
        } catch (error) {
          console.log(error);
          ws.send(`<md-block id="response-${messageId}"></md-block>`);
          ws.send(
            `<md-block id="response-${messageId}">There was an error while generating the response, please refresh and start a new chat</md-block>`,
          );
        }
      },

      onClose: () => {
        inMemoryDb = inMemoryDb.filter((c) => c.chatId !== chatId);
        console.log("Connection closed");
      },
    };
  }),
);

app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const chatId = crypto.randomUUID();
  let path = "";

  if (file instanceof File) {
    path = file.name;
    const sizeInKb = Math.round(file.size / 1024);
    if (file.type !== "application/pdf") {
      return c.html(`
        <div hx-swap-oob="beforeend:#chat">
          <p class="text-center text-white">
            Invalid file type. Please upload a PDF file.
          </p>
        </div>
      `);
    }
    if (sizeInKb > 50) {
      return c.html(`
        <div hx-swap-oob="beforeend:#chat">
          <p class="text-center text-white">
            File too large. Please upload a file under 50kb.
          </p>
        </div>

        <form hx-encoding="multipart/form-data" hx-post="/upload" class="flex justify-between items-stretch gap-3"
          hx-swap="outerHTML">
          <input type="file" name="file" accept="application/pdf" required
            class="px-2 py-1 placeholder-gray-400 text-gray-200 bg-[#2C2C2C] border border-[#3E3E3E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none w-full" />
          <button
            class="bg-blue-600 text-white font-bold uppercase text-xs px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all ease-linear duration-150">
            Upload
          </button>
        </form>
      `);
    }
    if (inMemoryDb.length >= 5) {
      return c.html(`
        <div hx-swap-oob="beforeend:#chat">
          <p class="text-center text-white">
            Too many active chats. Please try again later.
          </p>
        </div>
      `);
    }

    const fileBytes = await file.arrayBuffer();
    const context = fileToGenerativePart(
      new Uint8Array(fileBytes),
      "application/pdf",
    );
    path = context.inlineData.data;
    inMemoryDb.push({ chatId, context });
  }

  return c.html(`
    <section id="preview" hx-swap-oob="true" class="bg-[#212121] rounded-lg overflow-hidden place-items-center hidden lg:grid">
      <iframe src="data:application/pdf;base64,${path}" class="w-full h-full"></iframe>
    </section>

    <div hx-ext="ws" ws-connect="/ws?chatId=${chatId}">
      <form id="form" ws-send class="flex justify-between items-stretch gap-3" hx-on:submit="this.reset()">
        <textarea name="prompt" type="text" placeholder="Enter prompt here" required
          class="px-2 py-1 placeholder-gray-400 text-gray-200 bg-[#2C2C2C] border border-[#3E3E3E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none w-full h-12"></textarea>

        <button type="submit"
          class="bg-blue-600 text-white font-bold uppercase text-xs px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all ease-linear duration-150">
          Send
        </button>
      </form>
    </div>
  `);
});

Deno.serve(app.fetch);
