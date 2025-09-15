# 📁 Project Structure

```
tutedude-proctoring/
├── 📄 README.md                 # Comprehensive project documentation
├── 📄 DEPLOYMENT.md             # Deployment guide and instructions
├── 📄 DEMO_SCRIPT.md            # Demo walkthrough script
├──
├── 📂 backend/                  # Node.js Express API Server
│   ├── 📄 package.json          # Backend dependencies
│   ├── 📄 server.js             # Main server file with API routes
│   ├── 📄 .env                  # Environment variables
│   └── 📁 uploads/              # Video file storage directory
│
└── 📂 frontend/                 # React TypeScript Application
    ├── 📄 package.json          # Frontend dependencies
    ├── 📄 vite.config.ts        # Vite build configuration
    ├── 📄 tsconfig.json         # TypeScript configuration
    ├── 📄 index.html            # Main HTML entry point
    ├──
    ├── 📂 src/
    │   ├── 📄 main.tsx           # React application entry point
    │   ├── 📄 App.tsx            # Main app component with routing
    │   ├── 📄 App.css            # Global styles and component CSS
    │   ├──
    │   ├── 📂 components/        # React Components
    │   │   ├── 📄 InterviewSetup.tsx       # Interview creation form
    │   │   ├── 📄 CandidateView.tsx        # Candidate video interface
    │   │   └── 📄 InterviewerDashboard.tsx # Interviewer monitoring panel
    │   ├──
    │   ├── 📂 hooks/             # Custom React Hooks
    │   │   ├── 📄 useComputerVision.ts     # Face detection & tracking
    │   │   └── 📄 useObjectDetection.ts    # Object recognition system
    │   ├──
    │   ├── 📂 utils/             # Utility Functions
    │   │   └── 📄 reportGenerator.ts       # PDF/CSV report generation
    │   ├──
    │   └── 📂 assets/            # Static Assets
    │       └── 📄 react.svg      # React logo
    └──
    └── 📂 public/               # Public Static Files
        └── 📄 vite.svg          # Vite logo
```

## 🏗️ Architecture Overview

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React App (TypeScript)               │
├─────────────────────────────────────────────────────────┤
│  Router  │  Components  │  Hooks  │  Utils  │  Assets  │
├─────────────────────────────────────────────────────────┤
│              Computer Vision Layer                      │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   MediaPipe     │    │      TensorFlow.js          │ │
│  │   FaceMesh      │    │      COCO-SSD              │ │
│  │   (Face Track)  │    │   (Object Detection)        │ │
│  └─────────────────┘    └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 Browser APIs                            │
│  getUserMedia  │  Canvas  │  WebRTC  │  File API       │
└─────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Express.js Server                        │
├─────────────────────────────────────────────────────────┤
│     API Routes     │   Middleware   │   File Upload     │ │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │               MongoDB Database                      │ │
│  │  ┌─────────────┐    ┌─────────────┐               │ │
│  │  │  Sessions   │    │   Events    │               │ │
│  │  │  Collection │    │  Collection │               │ │
│  │  └─────────────┘    └─────────────┘               │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Interview Session Lifecycle

```
1. Setup → 2. Monitor → 3. Detect → 4. Log → 5. Report

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Setup     │───▶│   Monitor   │───▶│   Detect    │
│  Interview  │    │   Video     │    │  Violations │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Report    │◄───│     Log     │◄───│   Score     │
│  Generate   │    │   Events    │    │  Calculate  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Real-time Event Flow

```
Video Frame → CV Processing → Event Detection → API Call → Database → Dashboard Update

┌──────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│  Camera  │───▶│MediaPipe/ │───▶│ Event    │───▶│Backend  │───▶│Dashboard │
│  Stream  │    │TF.js     │    │Detection │    │API      │    │Update    │
└──────────┘    └───────────┘    └──────────┘    └─────────┘    └──────────┘
     │               │                │              │             │
     ▼               ▼                ▼              ▼             ▼
  30fps Video    468 landmarks    Event Types    MongoDB      Live Alerts
  Processing     Object Boxes     Severity       Storage      Score Update
```

## 🧩 Component Responsibilities

### InterviewSetup Component

-   **Purpose**: Session initialization interface
-   **Features**: Form validation, session creation, navigation
-   **Tech**: React hooks, form handling, API calls

### CandidateView Component

-   **Purpose**: Candidate monitoring interface
-   **Features**: Video capture, real-time CV, violation display
-   **Tech**: MediaPipe, TensorFlow.js, Canvas API, WebRTC

### InterviewerDashboard Component

-   **Purpose**: Real-time monitoring and control panel
-   **Features**: Live statistics, event feed, report generation
-   **Tech**: Polling API, real-time updates, PDF/CSV export

## 🔧 Custom Hooks

### useComputerVision Hook

```typescript
// Face detection, gaze tracking, drowsiness monitoring
const { isInitialized, faceData, triggerEvent } = useComputerVision({
    videoRef,
    canvasRef,
    sessionId,
    onEvent: handleViolation,
});
```

### useObjectDetection Hook

```typescript
// Real-time object recognition and violation detection
const { isLoaded, detectionData, toggleDetection } = useObjectDetection({
    videoRef,
    canvasRef,
    sessionId,
    enabled: true,
    onEvent: handleObjectViolation,
});
```

## 📊 Data Models

### Session Schema

```javascript
{
  _id: ObjectId,
  candidateName: String,
  interviewerId: String,
  startTime: Date,
  endTime: Date,
  isActive: Boolean,
  integrityScore: Number (100),
  events: [{
    type: String,           // 'focus_lost', 'object_detected', etc.
    description: String,     // Human readable description
    timestamp: Date,        // When event occurred
    severity: String        // 'low', 'medium', 'high'
  }]
}
```

### Event Types

```javascript
EVENT_TYPES = {
    FOCUS_LOST: "focus_lost", // Looking away >5s
    NO_FACE: "no_face", // No face >10s
    MULTIPLE_FACES: "multiple_faces", // >1 person detected
    OBJECT_DETECTED: "object_detected", // Unauthorized item
    DROWSINESS: "drowsiness", // Eyes closed >3s
};

SEVERITY_POINTS = {
    low: -2, // Minor violations
    medium: -5, // Moderate violations
    high: -10, // Major violations
};
```

## 🚀 Performance Optimizations

### Frontend Optimizations

-   **Lazy Loading**: MediaPipe/TensorFlow.js models loaded on demand
-   **Frame Throttling**: CV processing at optimal intervals (3s for objects)
-   **Canvas Optimization**: Minimal redraws, efficient rendering
-   **Memory Management**: Cleanup on component unmount

### Backend Optimizations

-   **MongoDB Indexing**: Session ID and timestamp indexes
-   **Request Batching**: Event logging with rate limiting
-   **File Compression**: Video upload optimization
-   **Connection Pooling**: Efficient database connections

### Computer Vision Optimizations

-   **Model Selection**: MobileNet for speed vs accuracy balance
-   **Confidence Thresholds**: 60% minimum to reduce false positives
-   **Processing Intervals**: Face detection (30fps), Object detection (3s)
-   **Landmark Reduction**: Key points only for gaze calculation

## 🔒 Security Considerations

### Data Privacy

-   **Local Processing**: CV algorithms run client-side
-   **Minimal Data Transfer**: Only events sent to server
-   **Secure Storage**: MongoDB with proper access controls
-   **Session Isolation**: Unique IDs prevent data mixing

### Performance Security

-   **Rate Limiting**: Prevent API abuse
-   **File Size Limits**: Video upload restrictions
-   **Input Validation**: Sanitize all user inputs
-   **CORS Configuration**: Restrict cross-origin requests

## 🧪 Testing Strategy

### Unit Testing (Recommended)

```bash
# Frontend tests
cd frontend
npm install --save-dev @testing-library/react jest
npm test

# Backend tests
cd backend
npm install --save-dev mocha chai supertest
npm test
```

### Integration Testing

-   **API Endpoints**: Session CRUD operations
-   **CV Pipeline**: Face/object detection accuracy
-   **Real-time Updates**: Event flow from detection to dashboard
-   **Report Generation**: PDF/CSV export functionality

### Performance Testing

-   **Load Testing**: Multiple concurrent sessions
-   **Memory Profiling**: CV processing overhead
-   **Network Testing**: API response times
-   **Browser Compatibility**: Chrome, Firefox, Safari

---

**Total LOC**: ~2,500 lines
**Build Time**: ~30 seconds (frontend), instant (backend)
**Bundle Size**: ~2MB (with CV libraries)
**Browser Support**: Chrome 80+, Firefox 75+, Safari 13+
