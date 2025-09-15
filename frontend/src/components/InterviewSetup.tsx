import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const InterviewSetup: React.FC = () => {
    const [candidateName, setCandidateName] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const startInterview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!candidateName.trim()) {
            alert("Please enter your name");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/session/start`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        candidateName: candidateName.trim(),
                        interviewerId: "AUTO_" + Date.now(),
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                // Navigate directly to candidate view
                navigate(`/candidate/${data.sessionId}`);
            } else {
                alert("Failed to start interview session");
            }
        } catch (error) {
            console.error("Error starting interview:", error);
            alert("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="card"
            style={{ maxWidth: "500px", margin: "2rem auto" }}
        >
            <h2
                style={{
                    textAlign: "center",
                    marginBottom: "2rem",
                    color: "#374151",
                }}
            >
                🎬 Start Video Interview
            </h2>

            <form onSubmit={startInterview}>
                <div className="form-group">
                    <label className="form-label" htmlFor="candidateName">
                        Your Name
                    </label>
                    <input
                        id="candidateName"
                        type="text"
                        className="form-input"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "1.1rem" }}
                    disabled={loading}
                >
                    {loading ? "⏳ Starting..." : "🚀 Start Interview"}
                </button>
            </form>

            <div
                style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    background: "#f3f4f6",
                    borderRadius: "8px",
                }}
            >
                <h4 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
                    📋 What happens next:
                </h4>
                <ul
                    style={{
                        margin: 0,
                        paddingLeft: "1.5rem",
                        color: "#6b7280",
                    }}
                >
                    <li>Camera access will be requested</li>
                    <li>Real-time monitoring begins automatically</li>
                    <li>You'll see alerts for any violations</li>
                    <li>View detailed report when you finish</li>
                </ul>
            </div>
        </div>
    );
};

export default InterviewSetup;
