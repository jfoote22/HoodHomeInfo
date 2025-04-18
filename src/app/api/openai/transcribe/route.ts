import { NextResponse } from "next/server";
import fs from "fs";
import OpenAI from "openai";

// Check if OpenAI API key exists
const apiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;

if (apiKey) {
  openai = new OpenAI({
    apiKey: apiKey
  });
}

export async function POST(req: Request) {
  // Check if OpenAI client is initialized
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key is missing or invalid. Please add it to your environment variables." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const base64Audio = body.audio;

  // Validate input
  if (!base64Audio) {
    return NextResponse.json(
      { error: "No audio data provided" },
      { status: 400 }
    );
  }

  // Convert the base64 audio data to a Buffer
  const audio = Buffer.from(base64Audio, "base64");

  // Define the file path for storing the temporary WAV file
  const filePath = "tmp/input.wav";

  try {
    // Create tmp directory if it doesn't exist
    if (!fs.existsSync("tmp")) {
      fs.mkdirSync("tmp");
    }

    // Write the audio data to a temporary WAV file synchronously
    fs.writeFileSync(filePath, audio);

    // Create a readable stream from the temporary WAV file
    const readStream = fs.createReadStream(filePath);

    const data = await openai.audio.transcriptions.create({
      file: readStream,
      model: "whisper-1",
    });

    // Remove the temporary file after successful processing
    fs.unlinkSync(filePath);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing audio:", error);
    
    // Clean up temporary file if it exists
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
    
    return NextResponse.json(
      { error: "Failed to transcribe audio", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
