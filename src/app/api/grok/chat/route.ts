export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // Check if API key is available
    const apiKey = (process.env.GROK_API || process.env.GROK_API_KEY || process.env.XAI_API_KEY || "").trim();
    if (!apiKey || /^your_/i.test(apiKey)) {
      return new Response(
        JSON.stringify({
          error: "Missing Grok API key. Set GROK_API (locally in .env.local; on Vercel: Settings > Environment Variables, Production, then redeploy). See /api/status/env for which keys this deployment can see."
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, context } = await req.json();
    const liveContext = typeof context === "string" && context.trim() ? context.trim() : null;
    
    // Convert messages to Grok format
    const grokMessages = messages.filter((msg: any) => msg.role !== 'system').map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Get system message content - Updated to allow model identity while keeping Hood Canal context
    const systemMessage = messages.find((msg: any) => msg.role === 'system');
    const systemContent = systemMessage?.content || `You are Grok, an AI built by xAI, currently helping visitors and residents of Hood Canal, Washington.
        
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
        When asked about your identity, acknowledge that you are Grok while emphasizing your current role helping with Hood Canal information.
        
        Be conversational, friendly, and concise. If you don't have specific information, acknowledge that and suggest how the user might get that information.
        
        For tides specifically, Hood Canal's tides are influenced by Puget Sound and the Pacific Ocean, with two high tides and two low tides typically occurring each day.

        You are being shown on a wall-mounted TV dashboard in a home in Union, WA. Keep answers to 1-3 short sentences so they fit on screen.`;
    const groundedSystem = liveContext
      ? `${systemContent}

LIVE CONDITIONS RIGHT NOW (from the dashboard's weather, NOAA tide, and whale-sighting feeds - treat as ground truth):
${liveContext}`
      : systemContent;

    // Enhanced reliability for Grok API with retries
    let data;
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-latest",
            messages: [
              {
                role: "system",
                content: groundedSystem
              },
              ...grokMessages
            ],
            stream: false,
            temperature: 0.7,
            max_tokens: 2000,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Grok API error: ${response.status} - ${errorData}`);
        }

        data = await response.json();
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.error(`Grok API attempt ${attempt + 1} failed:`, error);
        
        if (attempt < 2) { // Don't delay on last attempt
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!data) {
      throw lastError;
    }
    const content = data.choices?.[0]?.message?.content || "I apologize, but I didn't receive a proper response. Please try again.";

    // Create a streaming response that simulates the streaming behavior expected by the frontend
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Split the content into characters to simulate streaming (safer than words)
          const chars = content.split('');
          let index = 0;

          const pushChar = () => {
            if (index < chars.length) {
              const char = chars[index];
              // Format for Vercel AI SDK streaming - properly escape quotes and other special chars
              let escapedChar = char;
              if (char === '"') escapedChar = '\\"';
              if (char === '\\') escapedChar = '\\\\';
              if (char === '\n') escapedChar = '\\n';
              if (char === '\r') escapedChar = '\\r';
              if (char === '\t') escapedChar = '\\t';
              
              controller.enqueue(encoder.encode(`0:"${escapedChar}"\n`));
              index++;
              // Faster streaming for better UX
              setTimeout(pushChar, 20);
            } else {
              controller.close();
            }
          };

          pushChar();
        } catch (error) {
          console.error("Stream simulation error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("Grok API error:", error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({
          error: "Grok API request timed out. Please try again."
        }),
        { status: 408, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: `Error connecting to Grok API: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}