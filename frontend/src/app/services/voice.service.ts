import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VoiceQueryRequest {
  audio_data: string;
  language?: string;
  session_id?: string;
}

export interface VoiceQueryResponse {
  transcribed_text: string;
  detected_language: string;
  response: string;
  audio_response: string;
  session_id?: string;
  conversation_history?: any[];
}

export interface SupportedLanguage {
  code: string;
  speech_recognition: string;
  text_to_speech: string;
  display_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private baseUrl = 'https://agri-backend-m6p7.onrender.com';

  constructor(private http: HttpClient) { }

  // Voice query with base64 audio
  voiceQuery(request: VoiceQueryRequest): Observable<VoiceQueryResponse> {
    return this.http.post<VoiceQueryResponse>(`${this.baseUrl}/voice/ask`, request);
  }

  // Voice query with file upload
  voiceQueryFile(audioFile: File, language: string = 'auto', sessionId?: string): Observable<VoiceQueryResponse> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    return this.http.post<VoiceQueryResponse>(`${this.baseUrl}/voice/ask-file`, formData);
  }

  // Get supported languages
  getSupportedLanguages(): Observable<{ [key: string]: SupportedLanguage }> {
    return this.http.get<{ [key: string]: SupportedLanguage }>(`${this.baseUrl}/voice/supported-languages`);
  }

  // Text to speech
  textToSpeech(text: string, language: string = 'en'): Observable<{ audio_data: string; language: string; text: string }> {
    return this.http.post<{ audio_data: string; language: string; text: string }>(
      `${this.baseUrl}/voice/text-to-speech`,
      null,
      { params: { text, language } }
    );
  }

  // Speech to text
  speechToText(audioFile: File, language: string = 'auto'): Observable<{ transcribed_text: string; detected_language: string; original_language: string }> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);

    return this.http.post<{ transcribed_text: string; detected_language: string; original_language: string }>(
      `${this.baseUrl}/voice/speech-to-text`,
      formData
    );
  }

  // Utility method to convert audio blob to base64
  async audioBlobToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  // Utility method to play audio from base64
  playAudioFromBase64(base64Audio: string): void {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  }
} 