# CodeLens

CodeLens is a powerful code analysis tool that helps developers understand their code better through AI-powered analysis. It provides detailed insights into code structure, language detection, and generates comprehensive documentation.

## Features

- 🧠 AI-powered code analysis
- 📊 Detailed code structure analysis
- 🔍 Automatic language detection
- 📝 Code documentation generation
- 💻 Syntax highlighting
- 📁 Multiple file support
- 🚀 Fast and efficient processing

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/codelens.git
cd codelens
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
python app.py
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Testing

### Backend Tests
```bash
cd backend
python -m unittest test_app.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Project Structure

```
codelens/
├── backend/
│   ├── app.py              # Flask backend server
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   └── setupTests.ts  # Test setup
│   └── package.json       # Node.js dependencies
└── README.md              # Project documentation
```

## Security Features

- Rate limiting
- Input validation
- CORS protection
- File size limits
- File type validation
- Error handling
- Logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Flask for the backend framework
- React for the frontend framework
- Pygments for code highlighting
- React Syntax Highlighter for frontend syntax highlighting 