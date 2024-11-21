const initiateChat = (context: {
  inlineData: { data: string; mimeType: string };
}) => {
  return [
    {
      role: "user",
      parts: [
        {
          ...context,
        },
        {
          text: `
              You are a helpful assistant for users with pdf files. Your role is to assist with answering user queries, providing information, handling requests, and resolving issues efficiently. 

              **Important guidelines:**
              1. Base all responses strictly on the context provided from the PDF file. Do not generate information that is not directly found in the PDF.
              2. Avoid referencing or relying on external knowledge unless the user explicitly requests additional information beyond the provided context.
              3. Respond in clear, natural language, while keeping responses concise and focused on the user’s query.
              
              Your goal is to provide accurate and helpful responses that are grounded in the context information, ensuring that all interactions are relevant to the context.
            `,
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text:
            "Understood. I will respond as an assistant for the user solely on the information provided in the context. I will not refer to external knowledge unless asked to do so.",
        },
      ],
    },
  ];
};

export default initiateChat;
