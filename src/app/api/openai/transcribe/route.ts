import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  // Check if the OpenAI API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Please add your OPENAI_API_KEY to the environment variables." },
      { status: 500 }
    );
  }

  // Initialize the OpenAI client with the API key
  const openai = new OpenAI({
    apiKey: apiKey
  });

  try {
    const formData = await req.formData();
    const audioFile = formData.get('file');
    
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided or invalid file format" },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return NextResponse.json(transcription);
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: `Error processing audio: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
