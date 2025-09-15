import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import InterviewSetup from "./components/InterviewSetup";
import CandidateView from "./components/CandidateView";
import InterviewerDashboard from "./components/InterviewerDashboard";
import "./App.css";

function App() {
    return (
        <Router>
            <div className="app">
                <header className="app-header">
                    <h1>🎯 Tutedude Proctoring System</h1>
                </header>
                <main>
                    <Routes>
                        <Route path="/" element={<InterviewSetup />} />
                        <Route
                            path="/candidate/:sessionId"
                            element={<CandidateView />}
                        />
                        <Route
                            path="/interviewer/:sessionId"
                            element={<InterviewerDashboard />}
                        />
                    </Routes>
                </main>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: "#363636",
                            color: "#fff",
                        },
                    }}
                />
            </div>
        </Router>
    );
}

export default App;
