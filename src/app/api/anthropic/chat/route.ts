import { streamText } from "ai";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

export async function POST(req: Request) {
  // Check if Anthropic API key exists
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Log API key status (only first 5 chars for security)
  console.log(`Anthropic API key status: ${apiKey ? 'Present (starts with: ' + apiKey.substring(0, 5) + '...)' : 'Missing'}`);
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Anthropic API key is missing. Please add it to your environment variables as ANTHROPIC_API_KEY."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();
    
    // Initialize the Anthropic client with the API key
    console.log("Initializing Anthropic client with official SDK...");
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
    
    // Create the system message
    const systemPrompt = `You are HoodHomeInfo, a helpful AI assistant for visitors and residents of Hood Canal, Washington.
        
        About Hood Canal:
        Hood Canal is a fjord forming the western lobe, and one of the four main basins, of Puget Sound in the state of Washington. 
        It is approximately 50 miles long and averages about 1.5 miles wide. The waterway separates the Kitsap Peninsula from the 
        Olympic Peninsula. It features beautiful landscapes, diverse marine life, outdoor recreation, and charming communities.
        
        You help with information about:
        - Local tides (high and low tides affecting the canal)
        - Weather conditions and temperature
        - Sunrise and sunset times
        - Celestial events and astronomy
        - Local events and activities
        - Points of interest and recreation options
        
        Key facts about the Hood Canal area:
        - The Hood Canal Bridge connects the Olympic and Kitsap Peninsulas
        - Popular activities include shellfish harvesting, fishing, kayaking, and hiking
        - Notable communities include Hoodsport, Brinnon, Seabeck, and Union
        - Olympic National Park and Olympic National Forest are nearby
        - The area is known for its seafood, especially oysters, clams, and shrimp
        - Hood Canal experiences significant tidal changes, which affect recreation and wildlife viewing
        
        When users ask about local information like tides, weather, or time-based data, use the information provided to you in the conversation.
        
        Be conversational, friendly, and concise. If you don't have specific information, acknowledge that and suggest how the user might get that information.
        
        For tides specifically, Hood Canal's tides are influenced by Puget Sound and the Pacific Ocean, with two high tides and two low tides typically occurring each day.
        
        Current time information is provided in the user messages when relevant.`;
        
    // Use the streaming API
    const stream = await anthropicClient.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });
    
    // Convert the Anthropic stream to a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.text) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    console.log("Anthropic API call successful");
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("Anthropic API error:", error);
    
    // Provide more detailed error message
    let errorMessage = "Unknown error connecting to Anthropic API";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common API key issues
      if (errorMessage.includes("invalid") || errorMessage.includes("auth") || errorMessage.includes("key")) {
        errorMessage = "Invalid Anthropic API key. Please check that your key is correct and has the format 'sk-ant-api...'";
      } else if (errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED")) {
        errorMessage = "Network error connecting to Anthropic API. Please check your internet connection.";
      }
    }
    
    return new Response(
      JSON.stringify({
        error: `Error connecting to Anthropic API: ${errorMessage}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
