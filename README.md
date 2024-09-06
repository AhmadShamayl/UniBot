
Unibot Project

Welcome to the Unibot - an AI Teaching Assistant for Higher Education using a Large Language Model, built with React.js (frontend), Python/Flask (backend), and MongoDB (database). This application allows users to interact with an AI, upload documents for task creation and analysis, and manage chat sessions.

---

Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Features](#features)
4. [Setup Instructions](#setup-instructions)
   - [Frontend (React.js)](#frontend-reactjs-setup)
   - [Backend (Python/Flask)](#backend-pythonflask-setup)
   - [Database (MongoDB)](#database-mongodb-setup)
5. [Usage](#usage)
6. [Project Structure](#project-structure)


---

Project Overview

Unibot is designed to serve as a smart teaching assistant, utilizing GPT-3.5 Turbo for natural language processing. It allows users to chat with the AI, upload documents for analysis, and store their interactions for future reference. The project is divided into three main components:

- Frontend: Built with React.js, providing an interactive user interface.
- Backend: Implemented using Python/Flask, managing the application logic and API routes.
- Database: Uses MongoDB to store user information, documents, and chat sessions.

---

Technology Stack

- Frontend: React.js, VSCode, Node.js, HTML, CSS
- Backend: Python, Flask API, OpenAI, Gensim, Pycharm
- Database: MongoDB

---

Features

- User Authentication: Users can sign up, log in, and manage their accounts.
- Chat Interface: Engage in conversations with the AI, with options to start new chats and view chat history.
- Document Upload: Users can upload text documents for analysis by the AI.
- Session Management: Users can manage their chat sessions, including viewing past interactions and deleting history.

---

Setup Instructions

Frontend (React.js) Setup

1. Install `create-react-app` globally:

   npm install -g create-react-app
   
2. Create a new React project:

   npx create-react-app unibot

3. Navigate to the project directory:

   cd unibot
   
4. Start the development server:

   npm start

   This will start a local development server at [http://localhost:3000](http://localhost:3000).

Backend (Python/Flask) Setup

1. Create a virtual environment and install dependencies:

   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt


2. Set up environment variables (e.g., Flask app settings, MongoDB connection string).

3. Run the Flask development server:

   flask run

   The server will be available at [http://localhost:5000](http://localhost:5000).

Database (MongoDB) Setup

1. Install MongoDB and start the database server.
2. Create a new database called `Unibot`.
3. The database includes the following collections:
   - Users: Stores user-specific information.
   - Documents: Stores content of uploaded files.
   - Sessions: Stores chat session details.

---

Usage

Logging In

- Enter your username and password to log in.
- If you don't have an account, click on "Sign up" to create a new one.

Interacting with the AI

- Type queries in the input box and press "Enter" or click "Send."
- Upload a text document in `.txt` format for analysis by the AI.

Managing Chat Sessions

- View past chat sessions in the side panel.
- Start a new chat or delete existing chat history.

---

Project Structure

Frontend (React.js)

- `src/App.js`: Main component handling user login, chat interaction, and communication with the Flask backend.
- `src/SignUp.js`: Component for handling user registration.
- `src/assets/`: Static assets like images (e.g., UMT logo).

Backend (Python/Flask)

- `app.py`: Main Flask application file handling routes.
- `routes/`: Contains individual route files for handling different API requests (e.g., login, registration, chat, document upload).

Database (MongoDB)

- Users Collection: Stores user-specific data.
- Documents Collection: Stores uploaded documents.
- Sessions Collection: Stores chat sessions and interactions.

---

