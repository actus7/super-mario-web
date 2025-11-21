
import { GoogleGenAI } from "@google/genai";

export const generateLevelAI = async (userPrompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are a level designer for a Super Mario Bros clone. 
    Create a tilemap represented by an ASCII grid.
    
    Constraints:
    - Height: EXACTLY 15 characters.
    - Width: Between 100 and 200 characters.
    - Output ONLY the raw ASCII string. No markdown, no code blocks, no explanations.
    
    Legend:
    ' ' (space) = Air
    'G' = Ground (Solid block)
    'B' = Brick (Breakable)
    '?' = Question Block (Has item)
    '#' = Hard Block (Unbreakable)
    'e' = Goomba Enemy
    'k' = Koopa Troopa Enemy
    'M' = Mario Start Position (Must have exactly ONE 'M' near the start)
    '[' = Pipe Bottom Left
    ']' = Pipe Bottom Right
    '{' = Pipe Top Left
    '}' = Pipe Top Right
    
    Design Rules:
    1. The bottom 2 rows (rows 13 and 14) must be mostly 'G' to prevent falling forever, but you can add pits.
    2. Ensure the level is playable (jumps are possible).
    3. Be creative based on the user's request.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a level with this style: ${userPrompt}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    
    const text = response.text;
    if (!text) return null;
    
    // Clean up markdown if present
    return text.replace(/```/g, '').trim();
  } catch (error) {
    console.error("AI Level Generation Failed:", error);
    return null;
  }
};