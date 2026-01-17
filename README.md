# Interactive Avatar Guide: I am still here project

# 

# Overview

# 

# This project is an interactive, web-based conversational avatar that acts as a narrative guide to the lives of former political prisoners. Users can ask questions either through text or voice, and the avatar responds verbally while animating in real time.

# 

# The system is designed as an educational and exploratory tool, allowing users to quickly access historically grounded information while maintaining a human, guided storytelling tone. All answers should be delivered in English (it still needs improvement), even though the source archival materials are written in Romanian.

# 

# The project combines:

# 

* # A 3D animated avatar (Three.js)
* # Speech-to-text (browser-based)
* # Text-to-speech (browser-based)
* # A backend language model that extracts and synthesizes information from archival documents

# 

# Features

# 

* # Two interaction modes

# 

* # Text-to-text (chat interface)
* # Speech-to-speech (microphone input + spoken avatar output)

# 

# 3D Avatar

# 

* # Real-time jaw and head animation while speaking (this is what I intended, but there was no jaw detected, so it remained only a pulsing animation)
* # Minimalist black-stage presentation

# 

# Historically grounded answers

# 

* # Answers are generated strictly from a fixed archive of documents
* # No external knowledge or hallucinated characters

# 

# Narrative persona

# 

* # The avatar speaks as a guide and narrator
* # Factual when needed, poetic or reflective when appropriate

# 

# Technologies Used

# 

# Frontend

# 

* # HTML / CSS / JavaScript
* # Three.js (3D rendering)
* # Web Speech API (SpeechRecognition + SpeechSynthesis)

# 

# Backend

# 

* # Node.js
* # Express
* # Local or free-access LLM (via API)
* # Archive-based prompt construction

# 

# Project Structure

# 

# project-root/

# │

# ├── public/

# │   ├── voice.js

# │   ├── index.html

# │   ├── avatar.glb

# │   └── styles.css

# │

# ├── archives/

# │   ├── prisoner1.txt

# │   ├── prisoner2.txt

# │   └── ...

# │

# ├── server.js

# ├── package.json

# └── README.md

# 

# How It Works

# 

# 1\. The user asks a question via text or voice.

# 2\. Voice input is transcribed using the browser’s Speech Recognition API.

# 3\. The question is sent to the backend `/api/ask` endpoint.

# 4\. The server:

# 

* # Searches relevant archival texts
* # Injects them into a strict system prompt
* # Forces English-only output (this is what I have tried to force in the prompt, still needs work)
* # Prevents hallucination beyond the archive

# 5\. The response is returned to the frontend.

# 6\. The avatar speaks the answer using browser TTS while animating.

# 

# How to Run the Project Locally

# 

# Prerequisites

# 

* # Node.js (v18 or newer)
* # Chrome or Edge (required for SpeechRecognition)
* # A free API key or local LLM setup (depending on configuration)

# 

# Installation

# 

# 1\. Clone the repository:

# 

# &nbsp;  ```bash

# &nbsp;  git clone https://github.com/your-username/your-repo-name.git

# &nbsp;  ```

# 

# 2\. Navigate to the project folder:

# 

# &nbsp;  ```bash

# &nbsp;  cd your-repo-name

# &nbsp;  ```

# 

# 3\. Install dependencies:

# 

# &nbsp;  ```bash

# &nbsp;  npm install

# &nbsp;  ```

# 

# 4\. Start the server:

# 

# &nbsp;  ```bash

# &nbsp;  node server.js

# &nbsp;  ```

# 

# 5\. Open your browser and go to:

# 

# &nbsp;  ```

# &nbsp;  http://localhost:3000

# &nbsp;  ```

# 

# ---

# 

# Usage Notes

# 

* # Microphone permissions must be enabled for speech-to-speech mode.
* # The project is intentionally limited to the provided archives.
* # If a question cannot be answered using the available documents, the avatar will state that the information is not available.

# 

# License

# 

# This project is intended for educational and research purposes.



