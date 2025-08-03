import { NgClass, NgFor } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [NgFor,NgClass,FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  userInput: string = '';
  messages: { text: string, role: 'user' | 'bot' }[] = [];

  constructor(private http: HttpClient) {}

  sendMessage() {
    const query = this.userInput.trim();
    if (!query) return;

    this.messages.push({ text: query, role: 'user' });
    this.userInput = '';

    this.http.post<any>('http://127.0.0.1:8002/ask', {
      query: query,
      language: 'en'
    }).subscribe({
      next: (res) => {
        this.messages.push({ text: res.response, role: 'bot' });
      },
      error: (err) => {
        this.messages.push({ text: "Error: " + err.message, role: 'bot' });
      }
    });
  }
}
