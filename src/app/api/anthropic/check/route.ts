import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "edge";

export async function GET() {
  try {
    // Check if API key exists
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "Anthropic API key is missing or empty", 
          apiKeyPresent: false 
        },
        { status: 400 }
      );
    }
    
    // Log the first 5 characters of the API key (for debugging)
    console.log(`Anthropic API key check: ${apiKey.substring(0, 5)}...`);
    
    // Check if the API key has the correct format (sk-ant-api...)
    if (!apiKey.startsWith('sk-ant-api')) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "Anthropic API key has incorrect format. Should start with 'sk-ant-api'", 
          apiKeyPresent: true,
          apiKeyValid: false
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        status: "success", 
        message: "Anthropic API key is present and has the correct format", 
        apiKeyPresent: true,
        apiKeyValid: true
      }
    );
  } catch (error) {
    console.error("Error checking Anthropic API:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: `Error checking Anthropic API: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
} 