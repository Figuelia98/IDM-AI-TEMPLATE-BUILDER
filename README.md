# IDM AI Template Builder

An intelligent, AI-powered template builder designed to streamline the creation and management of IDM (Identity and Access Management) templates. This application combines a robust Python backend with a modern React frontend to provide an intuitive interface for building, mapping, and merging templates.

## 🎯 Features

- **AI-Powered Template Editing**: Leverage AI assistance to create and modify templates efficiently
- **Multi-Mode AI Chat**: Four specialized chat modes (Ask, Agent, Plan, Debug) for different workflows
- **Template Mapping**: Map fields between different template structures with ease
- **Template Merging**: Combine multiple templates into a single unified template
- **Field Tree Visualization**: Navigate and visualize complex field hierarchies
- **Interactive Chat Interface**: Get AI assistance through an intuitive chat panel with contextual hints
- **XML Template Support**: Work with XML-based template formats
- **Responsive UI**: Modern, mobile-friendly interface built with React and Tailwind CSS

## 🏗️ Architecture

### Backend
- **Framework**: Python with Flask/FastAPI-like architecture
- **Location**: `/backend`
- **Key Services**:
  - `ai_editor.py`: AI-powered template editing capabilities
  - `mapper.py`: Field mapping and transformation logic
  - `merger.py`: Template merging functionality
  - `session_store.py`: Session management and storage
  - `structure_parser.py`: XML structure parsing
  - `template_parser.py`: Template parsing and processing

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with PostCSS
- **Location**: `/frontend`
- **Key Components**:
  - `App.jsx`: Main application container
  - `AiChat.jsx`: AI chat interface with 4 modes (Ask, Agent, Plan, Debug)
  - `FieldTree.jsx`: Field hierarchy visualization
  - `MappingPanel.jsx`: Template field mapping interface
  - `TemplatePanel.jsx`: Template management panel
  - `UploadPanel.jsx`: File upload interface
  - `api.js`: Backend API communication layer

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn** (for package management)
- **pip** (for Python packages)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python main.py
```

The backend will start on `http://localhost:5000` (or configured port).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (default Vite port).

## 📖 Usage

1. **Open the Application**: Navigate to `http://localhost:5173` in your browser
2. **Upload a Template**: Use the Upload Panel to upload your XML template file
3. **View Structure**: The Field Tree displays your template structure
4. **Edit with AI**: Use the AI Chat panel to get suggestions and make edits
5. **Map Fields**: Use the Mapping Panel to map fields between templates
6. **Merge Templates**: Combine multiple templates using the merge functionality
7. **Download**: Export your modified templates in XML format

### AI Chat Modes

The AI Chat interface supports four distinct modes to help you work with templates:

#### 🤖 **Ask Mode** (Default)
Ask questions about your template and get AI-powered answers.
- **Purpose**: Learn about template structure, field definitions, and validation rules
- **Example queries**:
  - "What fields are in this template?"
  - "What is the maximum length of the SSCC field?"
  - "Which fields are required?"
  - "Explain the purpose of this field"

#### 🤖 **Agent Mode**
Let AI directly modify and update your template based on your instructions.
- **Purpose**: Quickly make changes to templates without manual editing
- **Example queries**:
  - "Change the consignee to ACME France"
  - "Set SSCC to 312345601000030999"
  - "Add a new shipment ID field"
  - "Remove the deprecated tracking field"

#### 📋 **Plan Mode**
Create a structured plan for complex template modifications.
- **Purpose**: Break down complex changes into actionable steps
- **Example queries**:
  - "Plan how to add a new shipment field"
  - "Create a step-by-step plan to restructure the template"
  - "How should I merge these two templates?"
  - "Plan the migration from v1 to v2 format"

#### 🔍 **Debug Mode**
Diagnose and analyze issues with your template.
- **Purpose**: Validate templates and identify problems
- **Example queries**:
  - "Why is this field invalid?"
  - "Check for missing required fields"
  - "Validate the template structure"
  - "Find XML parsing errors"
  - "What's the root cause of this validation error?"

## 📁 Project Structure

```
IDM AI Template Builder/
├── backend/
│   ├── main.py                 # Application entry point
│   ├── requirements.txt         # Python dependencies
│   └── app/
│       ├── __init__.py
│       ├── models.py            # Data models
│       └── services/
│           ├── __init__.py
│           ├── ai_editor.py     # AI editing service
│           ├── mapper.py        # Field mapping service
│           ├── merger.py        # Template merging service
│           ├── session_store.py # Session management
│           ├── structure_parser.py   # XML structure parsing
│           └── template_parser.py    # Template parsing
├── frontend/
│   ├── index.html              # HTML entry point
│   ├── package.json            # JavaScript dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS config
│   ├── postcss.config.js       # PostCSS config
│   ├── public/                 # Static assets
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Main component
│       ├── api.js              # API client
│       ├── index.css           # Global styles
│       └── components/
│           ├── AiChat.jsx      # AI chat component
│           ├── FieldTree.jsx   # Field tree viewer
│           ├── MappingPanel.jsx    # Mapping interface
│           ├── TemplatePanel.jsx   # Template manager
│           └── UploadPanel.jsx     # File upload
└── samples/
    ├── MMS485PF Transport Label_Template.xml
    └── MMS485PF_StructureXml.xml
```

## 🛠️ Technologies

### Backend
- Python 3.8+
- Flask or FastAPI
- XML parsing libraries
- AI/ML integration libraries

### Frontend
- React 18
- Vite
- Tailwind CSS
- Axios (for API calls)
- JavaScript ES6+

## 🔌 API Endpoints

The backend provides the following main endpoints:

- `POST /api/templates/upload` - Upload a new template
- `GET /api/templates/<id>` - Retrieve template details
- `POST /api/templates/<id>/edit` - Edit template with AI assistance
- `POST /api/templates/map` - Map fields between templates
- `POST /api/templates/merge` - Merge multiple templates
- `GET /api/templates/<id>/download` - Download modified template
- `POST /api/chat` - AI chat endpoint
- `GET /api/sessions/<id>` - Retrieve session information

## 🚦 Development

### Running in Development Mode

**Terminal 1 - Backend**:
```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python main.py
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Building for Production

**Backend**:
```bash
cd backend
pip install -r requirements.txt
# Run with production server (e.g., gunicorn)
gunicorn main:app
```

**Frontend**:
```bash
cd frontend
npm run build
# Output will be in dist/ directory
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 📝 Sample Files

The `samples/` directory contains example template files:
- `MMS485PF Transport Label_Template.xml` - Sample transport label template
- `MMS485PF_StructureXml.xml` - Sample structure definition

These can be used to test template parsing and editing functionality.

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write or update tests
4. Submit a pull request with a clear description of changes

## 🐛 Troubleshooting

### Backend Issues
- **Port already in use**: Change the port in `main.py` or kill existing process
- **Module not found**: Ensure virtual environment is activated and `pip install -r requirements.txt` is run
- **XML parsing errors**: Verify template files are valid XML format

### Frontend Issues
- **npm install fails**: Delete `node_modules/` and `package-lock.json`, then retry
- **Port already in use**: Kill existing Vite process or configure different port in `vite.config.js`
- **API connection error**: Ensure backend is running on correct host/port in `api.js`

## 📄 License

This project is proprietary and maintained by Spoon Consulting Ltd.

## 📞 Support

For issues, questions, or suggestions, please contact the development team or create an issue in the repository.

---

**Last Updated**: 2026-08-18
