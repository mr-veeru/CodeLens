# CodeLens

CodeLens is a powerful code analysis tool that helps developers understand their code better through AI-powered analysis. It provides detailed insights into code structure, language detection, and generates comprehensive documentation.

<div align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/typescript-4.9.5-blue.svg" alt="TypeScript 4.9.5" />
  <img src="https://img.shields.io/badge/flask-2.2.3-blue.svg" alt="Flask 2.2.3" />
</div>

## ✨ Features

- 🧠 **AI-powered code analysis** - Intelligent code parsing and understanding
- 📊 **Detailed code structure analysis** - Metrics on functions, classes, complexity
- 🔍 **Automatic language detection** - Support for 20+ programming languages
- 📝 **Code documentation generation** - Auto-generates comprehensive documentation
- 💻 **Syntax highlighting** - Beautiful code rendering with proper highlighting
- 📁 **Multiple file support** - Upload and analyze multiple files at once
- 🚀 **Fast and efficient processing** - Optimized backend for quick results
- 🔒 **Secure processing** - Local processing without sending code to external services

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- npm or yarn

## 🚀 Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/codelens.git
cd codelens
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
FLASK_DEBUG=True  # Set to False in production
FLASK_SECRET_KEY=your_secret_key  # Generate a secure random key
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

Create a `.env` file in the frontend directory with:

```
REACT_APP_API_URL=http://localhost:5000
```

## 🏃 Running the Application

### Start the Backend Server

```bash
cd backend
python app.py
# or for production
gunicorn app:app
```

### Start the Frontend Development Server

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`.

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
# or for coverage report
coverage run -m pytest && coverage report
```

### Frontend Tests

```bash
cd frontend
npm test
# or with coverage
npm test -- --coverage
```

## 📦 Building for Production

```bash
cd frontend
npm run build
```

## 🏛️ Architecture

### Frontend

- **React** with TypeScript for type safety
- **Material UI** for modern component design
- **React Context API** for state management
- **Axios** for API communication
- **React Syntax Highlighter** for code display

### Backend

- **Flask** web framework
- **Pygments** for language detection and parsing
- **Flask-Limiter** for rate limiting
- **Custom caching** for improved performance
- **Comprehensive error handling** and logging

### Project Structure

```
codelens/
├── backend/
│   ├── app.py              # Flask backend server
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # State management
│   │   ├── App.tsx         # Main app component
│   │   └── index.tsx       # Entry point
│   ├── package.json        # Node.js dependencies
│   └── tsconfig.json       # TypeScript configuration
└── README.md               # Project documentation
```

## 🛡️ Security Features

- **Rate limiting** to prevent abuse
- **Input validation** to sanitize all user inputs
- **CORS protection** for API endpoints
- **Security headers** against common web vulnerabilities
- **File size limits** and file type validation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Flask for the backend framework
- React and Material UI for the frontend
- Pygments for code highlighting
- All open-source contributors 