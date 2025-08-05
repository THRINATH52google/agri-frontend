import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.css']
})
export class SpeechComponent {
  isRecording = false;
  mediaRecorder: any;
  audioChunks: any[] = [];
  responseText = '';
  transcribedText = '';

  constructor(private http: HttpClient) {}

  startRecording() {
    this.audioChunks = [];
    this.isRecording = true;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start();

      this.mediaRecorder.addEventListener("dataavailable", (event: any) => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.uploadAudio(audioBlob);
      });
    });
  }

  stopRecording() {
    this.isRecording = false;
    this.mediaRecorder.stop();
  }

  uploadAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    this.http.post<any>('http://localhost:8000/speech-query', formData).subscribe({
      next: (res) => {
        this.responseText = res.response;
        this.transcribedText = res.transcribed_text;
      },
      error: (err) => {
        console.error("Speech query error", err);
      }
    });
  }
}
