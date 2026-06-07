import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEBUG_PARSE = process.env.DEBUG_PARSE === "1";

export interface AiSplitRequest {
  prompt: string;
  audio?: { mimeType: string; data: string };
  participants: Array<{ uniqueId: string; username: string }>;
  items: Array<{ id: string; name: string; quantity: number }>;
}

export interface AiSplitResponse {
  allocations: Array<{
    itemId: string;
    assignedTo: string[]; // uniqueIds
  }>;
}

const SPLIT_INSTRUCTIONS = `You are an AI assistant that helps split a restaurant bill based on a user's voice/text command.
Return ONLY a valid JSON object. No markdown formatting, no extra text.

Input provided by the system:
- "participants": List of people (with uniqueId and username).
- "items": List of receipt items (with id, name, quantity).
- "command": The user's instruction on who ate what. If audio is provided, listen to the audio instead or along with the command.

Rules for splitting:
1. Match the people mentioned in the "command" or audio to the usernames in "participants". Use their uniqueIds.
2. If an item is explicitly assigned to specific people, put their uniqueIds in "assignedTo".
3. If an item is NOT mentioned OR the user says "the rest is shared", assign that item to ALL participants.
4. Return a JSON structure exactly like this:
{
  "allocations": [
    { "itemId": "item-id-1", "assignedTo": ["#1001", "#1002"] },
    { "itemId": "item-id-2", "assignedTo": ["#1003"] }
  ]
}
`;

export async function parseSplitCommand(req: AiSplitRequest): Promise<AiSplitResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const systemPrompt = `${SPLIT_INSTRUCTIONS}
---
Data:
participants: ${JSON.stringify(req.participants)}
items: ${JSON.stringify(req.items)}
command: "${req.prompt}"
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    
    const parts: any[] = [{ text: systemPrompt }];
    if (req.audio && req.audio.data && req.audio.mimeType) {
      parts.push({
        inlineData: {
          mimeType: req.audio.mimeType,
          data: req.audio.data,
        },
      });
    }

    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.1 },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Gemini API error: ${resp.status} ${errTxt}`);
    }

    const json = await resp.json();
    let text = "";
    if (Array.isArray(json.candidates)) {
      for (const cand of json.candidates) {
        const parts = cand?.content?.parts || cand?.parts || [];
        for (const p of parts) if (p.text) text += p.text;
      }
    }

    // Clean markdown if present
    const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/i, "$1").trim();
    if (DEBUG_PARSE) {
      console.log("[parseSplitCommand] Raw response:", cleaned);
    }
    
    // Attempt parse
    const parsed = JSON.parse(cleaned);
    if (!parsed.allocations || !Array.isArray(parsed.allocations)) {
      throw new Error("Invalid structure returned from AI");
    }

    return parsed as AiSplitResponse;

  } catch (error) {
    console.error("[parseSplitCommand] Error:", error);
    throw error;
  }
}
