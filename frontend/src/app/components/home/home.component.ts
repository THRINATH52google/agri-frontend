import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, NgClass, FormsModule, NgIf],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  userInput: string = '';
  messages: { text: string, role: 'user' | 'bot' }[] = [];
  isLoading: boolean = false;
  isRecording: boolean = false;
  mediaRecorder: any;
  audioChunks: any[] = [];
  autoStopTimeout: any = null;
  // The base URL for the backend endpoints
  private baseUrl = 'https://agri-backend-1.onrender.com';

  constructor(
    private http: HttpClient,
    private voiceService: VoiceService
  ) {}

  sendMessage() {
    const query = this.userInput.trim();
    if (!query) return;

    this.messages.push({ text: query, role: 'user' });
    this.userInput = '';

    this.http.post<any>(`${this.baseUrl}/ask`, {
      query: query
    }).subscribe({
      next: (res) => {
        this.messages.push({ text: res.response, role: 'bot' });
      },
      error: (err) => {
        this.messages.push({ text: "Error: " + err.message, role: 'bot' });
      }
    });
  }
  
  // Voice recording functionality
  startVoiceRecording() {
    if (this.isRecording) return;

    this.audioChunks = [];
    this.isRecording = true;

    navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      } 
    }).then(stream => {
      // Try different formats in order of preference
      let mimeType = 'audio/webm';
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      console.log('Using audio format:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      this.mediaRecorder.start();

      this.mediaRecorder.addEventListener("dataavailable", (event: any) => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.processVoiceQuery(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      });

      // Auto-stop after 10 seconds
      this.autoStopTimeout = setTimeout(() => {
        if (this.isRecording) {
          this.stopVoiceRecording();
        }
      }, 10000); // 10 seconds

    }).catch(err => {
      console.error('Error accessing microphone:', err);
      this.isRecording = false;
      this.messages.push({ text: "Error: Could not access microphone. Please check permissions.", role: 'bot' });
    });
  }

  stopVoiceRecording() {
  if (!this.isRecording) return;

  this.isRecording = false;

  // Clear auto-stop timeout if user stops manually
  if (this.autoStopTimeout) {
    clearTimeout(this.autoStopTimeout);
    this.autoStopTimeout = null;
  }

  if (this.mediaRecorder) {
    // Just stop the recording - the event listener in startVoiceRecording will handle the processing
    this.mediaRecorder.stop();
  }
}


  async processVoiceQuery(audioBlob: Blob) {
    try {
      // Show loading message
      this.messages.push({ text: "🎤 Processing voice query...", role: 'user' });
      
      console.log('Audio blob details:', {
        type: audioBlob.type,
        size: audioBlob.size,
        sizeInMB: (audioBlob.size / (1024 * 1024)).toFixed(2) + ' MB'
      });
      
      // Try base64 method first (more reliable)
      const base64Audio = await this.voiceService.audioBlobToBase64(audioBlob);
      
      console.log('Base64 audio length:', base64Audio.length);
      
      // Use base64 endpoint
      this.voiceService.voiceQuery({
        audio_data: base64Audio,
        language: 'auto'
      }).subscribe({
        next: (response) => {
          // Add transcribed text as user message
          if (response.transcribed_text) {
            this.messages.push({ text: `🎤 "${response.transcribed_text}"`, role: 'user' });
          }
          
          // Add bot response
          if (response.response) {
            this.messages.push({ text: response.response, role: 'bot' });
          }
          
          // Play audio response if available
          if (response.audio_response) {
            this.voiceService.playAudioFromBase64(response.audio_response);
          }
        },
        error: (err) => {
          console.error('Voice query error:', err);
          this.messages.push({ text: "Error processing voice query: " + err.message, role: 'bot' });
        }
      });
    } catch (error) {
      console.error('Error processing voice query:', error);
      this.messages.push({ text: "Error processing voice query", role: 'bot' });
    }
  }

  // Helper method to convert AudioBuffer to WAV
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Test method to check if backend accepts any audio
  testAudioUpload() {
    // Create a simple test audio file (1 second of silence)
    const testAudioData = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6D, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
    ]);
    
    const testFile = new File([testAudioData], 'test.wav', { type: 'audio/wav' });
    
    console.log('Testing with WAV file:', testFile);
    
    this.voiceService.voiceQueryFile(testFile, 'auto').subscribe({
      next: (response) => {
        console.log('Test successful:', response);
        this.messages.push({ text: "Test audio accepted by backend", role: 'bot' });
      },
      error: (err) => {
        console.error('Test failed:', err);
        this.messages.push({ text: "Test failed: " + err.message, role: 'bot' });
      }
    });
  }

  // File upload functionality (existing)
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append('file', file, file.name);

      this.messages.push({ text: `Uploading image: ${file.name}...`, role: 'user' });

      this.http.post<any>(`${this.baseUrl}/detect-disease/`, formData).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.messages.push({ text: res.solution, role: 'bot' });
        },
        error: (err) => {
          this.isLoading = false;
          this.messages.push({ text: "Error uploading image: " + err.message, role: 'bot' });
        }
      });
    }
  }
}
