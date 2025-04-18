import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // Check if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key") {
      return new Response(
        JSON.stringify({
          error: "Missing Anthropic API key. Please add your key to .env.local as ANTHROPIC_API_KEY."
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    
    // Use the correct model name
    const result = await streamText({
      model: anthropic("claude-3-7-sonnet-20250219"),
      messages: convertToCoreMessages(messages),
      system: `You are HoodHomeInfo, a helpful AI assistant for visitors and residents of Hood Canal, Washington.
        
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
        
        Current time information is provided in the user messages when relevant.`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Anthropic API error:", error);
    return new Response(
      JSON.stringify({
        error: `Error connecting to Anthropic API: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
