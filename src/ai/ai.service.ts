import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly models = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ];
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  async generateChat(contents: any[]): Promise<any> {
    let lastError = null;
    const body = JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 2048,
      },
    });

    for (const model of this.models) {
      const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (res.ok) {
          return await res.json();
        }
        const errText = await res.text();
        lastError = `${res.status} on ${model}: ${errText}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(`Gemini AI service failed. Last error: ${lastError}`);
  }
}
