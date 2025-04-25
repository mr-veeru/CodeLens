# CodeScope

CodeScope is a web tool that helps users understand code by automatically detecting programming languages and generating clear explanations of what the code does.

## Features
- Code upload or paste functionality
- Automatic language detection
- Code explanation generation
- Clean and responsive UI

## Tech Stack
- Frontend: React.js + Tailwind CSS
- Backend: Flask (Python)
- Language Detection: guesslang
- Code Summary: Custom logic with transformers

## Project Structure
```
codescope/
├── frontend/          # React frontend application
└── backend/          # Flask backend API
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python app.py`

### Frontend Setup
1. Navigate to the frontend directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Development
- Frontend runs on http://localhost:3000
- Backend API runs on http://localhost:5000 