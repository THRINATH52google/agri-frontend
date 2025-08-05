import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true, // Use standalone for modern Angular
  imports: [NgFor, NgClass, FormsModule,NgIf],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  userInput: string = '';
  messages: { text: string, role: 'user' | 'bot' }[] = [];
  isLoading: boolean = false; // New: Loading state for file upload

  // The base URL for the backend endpoints
  private baseUrl = 'http://127.0.0.1:8021';

  constructor(private http: HttpClient) {}

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

  // New: Method to handle file selection and upload
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isLoading = true; // Set loading state to true
      const formData = new FormData();
      formData.append('file', file, file.name);

      // Add a message to show the image is being processed
      this.messages.push({ text: `Uploading image: ${file.name}...`, role: 'user' });

      // Post the file to the new backend endpoint
      this.http.post<any>(`${this.baseUrl}/detect-disease/`, formData).subscribe({
        next: (res) => {
          this.isLoading = false; // Reset loading state
          this.messages.push({ text: res.solution, role: 'bot' });
        },
        error: (err) => {
          this.isLoading = false; // Reset loading state
          this.messages.push({ text: "Error uploading image: " + err.message, role: 'bot' });
        }
      });
    }
  }
}