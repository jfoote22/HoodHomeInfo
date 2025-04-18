import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  // Check if OpenAI API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "OpenAI API key is missing or invalid. Please add it to your environment variables."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({
        error: `Error connecting to OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
