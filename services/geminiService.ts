
import { GoogleGenAI, Type } from "@google/genai";
import { Mascot, Move } from "../types";

const MASCOT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    element: { type: Type.STRING },
    moves: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          power: { type: Type.NUMBER },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['attack', 'heal', 'buff'] }
        },
        required: ['name', 'power', 'description', 'type']
      }
    }
  },
  required: ['name', 'description', 'element', 'moves']
};

/**
 * Helper to retry API calls with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('429') || error?.message?.includes('503') || error?.status === 429;
    if (isRetryable && retries > 0) {
      console.warn(`API Rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateMascot = async (theme: string): Promise<Mascot> => {
  return withRetry(async () => {
    const ai = getAI();
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `「${theme}」をテーマにしたゆるキャラを1体作成してください。
      名前、性格、特徴、属性、そして4つの必殺技（名前と威力10-40、簡単な説明）を考えてください。
      必殺技は「攻撃」「回復」「バフ」をバランスよく混ぜてください。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: MASCOT_SCHEMA
      }
    });

    const mascotData = JSON.parse(textResponse.text || '{}');

    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `A cute, colorful Japanese Yuru-chara mascot named ${mascotData.name}. It is based on ${theme}. Style: Kawaii, clean lines, white background, high quality vector art style.`
        }]
      }
    });

    let imageUrl = "https://picsum.photos/400/400";
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: mascotData.name,
      description: mascotData.description,
      imageUrl: imageUrl,
      hp: 100,
      maxHp: 100,
      attack: 10 + Math.floor(Math.random() * 5),
      defense: 5 + Math.floor(Math.random() * 5),
      element: mascotData.element,
      moves: mascotData.moves
    };
  });
};

export const generateTeam = async (theme: string): Promise<Mascot[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `「${theme}」をテーマにしたゆるキャラ3体からなるチームを作成してください。
      それぞれのキャラに名前、属性、4つの必殺技（名前と威力、種類）を設定してください。
      それぞれ個性が出るようにしてください。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: MASCOT_SCHEMA
        }
      }
    });

    const teamData = JSON.parse(textResponse.text || '[]');
    
    // Generate all images in parallel to save time and handle potential individual failures
    const teamPromises = teamData.map(async (mascotData: any) => {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `Cute Japanese Yuru-chara mascot ${mascotData.name} based on ${theme}. Kawaii vector style.`
          }]
        }
      });

      let imageUrl = "https://picsum.photos/400/400";
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        ...mascotData,
        hp: 100,
        maxHp: 100,
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 5 + Math.floor(Math.random() * 5)
      };
    });

    return Promise.all(teamPromises);
  });
};

export const getNarrativeAction = async (attacker: Mascot, defender: Mascot, move: Move, result: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${attacker.name}が${defender.name}に「${move.name}」を使いました。
      技の内容: ${move.description}
      結果: ${result}
      この状況を、可愛らしくユーモアたっぷりに、実況者のような口調で1文で実況してください。`,
    });
    return response.text || `${attacker.name}の攻撃！`;
  });
};

export const generateVictoryMessage = async (winnerTeam: Mascot[], logs: string[]): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    const teamNames = winnerTeam.map(m => m.name).join('、');
    const battleHighlights = logs.slice(-5).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `プレイヤーのチーム（${teamNames}）がバトルに勝利しました！
      バトルのハイライト：
      ${battleHighlights}
      
      勝利を祝う、ゆるキャラバトルの実況者による最高にハイテンションで可愛らしい表彰メッセージを作成してください。2〜3文程度で、日本語でお願いします。`,
    });
    return response.text || "おめでとうございます！素晴らしい勝利でした！";
  });
};
