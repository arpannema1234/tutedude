import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { generatePDFReport, generateCSVReport } from "../utils/reportGenerator";

interface InterviewerDashboardProps {}

interface SessionData {
    sessionId: string;
    candidateName: string;
    startTime: string;
    isActive: boolean;
    integrityScore: number;
    eventCount: number;
    recentEvents: Array<{
        type: string;
        description: string;
        timestamp: string;
        severity: string;
    }>;
}

const InterviewerDashboard: React.FC<InterviewerDashboardProps> = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fullReport, setFullReport] = useState<any>(null);

    // Poll session status
    useEffect(() => {
        if (sessionId) {
            fetchSessionData();
            const interval = setInterval(fetchSessionData, 2000); // Poll every 2 seconds
            return () => clearInterval(interval);
        }
    }, [sessionId]);

    const fetchSessionData = async () => {
        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/status`
            );
            const data = await response.json();

            if (data.sessionId) {
                setSessionData(data);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching session data:", error);
            setLoading(false);
        }
    };

    const fetchFullReport = async () => {
        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/report`
            );
            const data = await response.json();
            setFullReport(data);
        } catch (error) {
            console.error("Error fetching full report:", error);
        }
    };

    const endInterview = async () => {
        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/end`,
                {
                    method: "PATCH",
                }
            );

            if (response.ok) {
                await fetchSessionData();
                await fetchFullReport();
                alert("Interview ended successfully!");
            }
        } catch (error) {
            console.error("Error ending interview:", error);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "#10b981";
        if (score >= 60) return "#f59e0b";
        return "#ef4444";
    };

    const getSeverityBadge = (severity: string) => {
        const colors = {
            low: "#10b981",
            medium: "#f59e0b",
            high: "#ef4444",
        };
        return colors[severity as keyof typeof colors] || "#6b7280";
    };

    const formatDuration = (startTime: string) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, "0")}`;
    };

    const exportReport = async (format: "json" | "csv" | "pdf") => {
        if (!fullReport) {
            await fetchFullReport();
            return;
        }

        if (format === "pdf") {
            generatePDFReport(fullReport);
            return;
        }

        if (format === "csv") {
            generateCSVReport(fullReport);
            return;
        }

        // JSON format
        const content = JSON.stringify(fullReport, null, 2);
        const filename = `interview-report-${sessionId}.json`;
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div
                className="card"
                style={{
                    textAlign: "center",
                    maxWidth: "400px",
                    margin: "2rem auto",
                }}
            >
                <h2>⏳ Loading Dashboard...</h2>
                <p>Connecting to interview session...</p>
            </div>
        );
    }

    if (!sessionData) {
        return (
            <div
                className="card"
                style={{
                    textAlign: "center",
                    maxWidth: "400px",
                    margin: "2rem auto",
                }}
            >
                <h2 style={{ color: "#ef4444" }}>❌ Session Not Found</h2>
                <p>Could not find interview session.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: "1rem" }}>
            {/* Header */}
            <div className="card">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, color: "#374151" }}>
                            👨‍💼 Interviewer Dashboard
                        </h2>
                        <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
                            Monitoring:{" "}
                            <strong>{sessionData.candidateName}</strong>
                        </p>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                        }}
                    >
                        {sessionData.isActive ? (
                            <>
                                <span className="status-indicator active">
                                    🟢 Live -{" "}
                                    {formatDuration(sessionData.startTime)}
                                </span>
                                <button
                                    className="btn btn-danger"
                                    onClick={endInterview}
                                >
                                    🏁 End Interview
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="status-indicator neutral">
                                    ⚫ Ended
                                </span>
                                <button
                                    className="btn btn-primary"
                                    onClick={fetchFullReport}
                                >
                                    📊 View Full Report
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-3">
                <div className="card" style={{ textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
                        🎯 Integrity Score
                    </h3>
                    <div
                        style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: getScoreColor(sessionData.integrityScore),
                            margin: "1rem 0",
                        }}
                    >
                        {sessionData.integrityScore}
                    </div>
                    <p style={{ margin: 0, color: "#6b7280" }}>out of 100</p>
                </div>

                <div className="card" style={{ textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
                        🚨 Total Events
                    </h3>
                    <div
                        style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color:
                                sessionData.eventCount > 10
                                    ? "#ef4444"
                                    : sessionData.eventCount > 5
                                    ? "#f59e0b"
                                    : "#10b981",
                            margin: "1rem 0",
                        }}
                    >
                        {sessionData.eventCount}
                    </div>
                    <p style={{ margin: 0, color: "#6b7280" }}>
                        violations detected
                    </p>
                </div>

                <div className="card" style={{ textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
                        ⏱️ Duration
                    </h3>
                    <div
                        style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: "#3b82f6",
                            margin: "1rem 0",
                        }}
                    >
                        {formatDuration(sessionData.startTime)}
                    </div>
                    <p style={{ margin: 0, color: "#6b7280" }}>minutes</p>
                </div>
            </div>

            {/* Recent Events */}
            <div className="grid grid-2">
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>🔄 Real-time Events</h3>
                    <div style={{ maxHeight: "400px", overflow: "auto" }}>
                        {sessionData.recentEvents.length === 0 ? (
                            <p
                                style={{
                                    color: "#6b7280",
                                    textAlign: "center",
                                    padding: "2rem",
                                }}
                            >
                                ✅ No violations detected yet
                            </p>
                        ) : (
                            sessionData.recentEvents
                                .slice()
                                .reverse()
                                .map((event, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: "1rem",
                                            margin: "0.5rem 0",
                                            background: "#f9fafb",
                                            borderRadius: "8px",
                                            borderLeft: `4px solid ${getSeverityBadge(
                                                event.severity
                                            )}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <h4
                                                    style={{
                                                        margin: "0 0 0.5rem 0",
                                                        color: "#374151",
                                                    }}
                                                >
                                                    {event.type
                                                        .replace(/_/g, " ")
                                                        .toUpperCase()}
                                                </h4>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        color: "#6b7280",
                                                    }}
                                                >
                                                    {event.description}
                                                </p>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "flex-end",
                                                    gap: "0.25rem",
                                                }}
                                            >
                                                <span
                                                    className="status-indicator"
                                                    style={{
                                                        background:
                                                            getSeverityBadge(
                                                                event.severity
                                                            ),
                                                        color: "white",
                                                        fontSize: "0.75rem",
                                                        padding:
                                                            "0.25rem 0.5rem",
                                                    }}
                                                >
                                                    {event.severity.toUpperCase()}
                                                </span>
                                                <small
                                                    style={{ color: "#9ca3af" }}
                                                >
                                                    {new Date(
                                                        event.timestamp
                                                    ).toLocaleTimeString()}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>🛠️ Controls & Reports</h3>

                    <div style={{ marginBottom: "2rem" }}>
                        <h4 style={{ color: "#374151", marginBottom: "1rem" }}>
                            📈 Export Report
                        </h4>
                        <div
                            style={{
                                display: "flex",
                                gap: "1rem",
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                className="btn btn-secondary"
                                onClick={() => exportReport("pdf")}
                                disabled={sessionData.isActive}
                            >
                                📄 PDF
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => exportReport("csv")}
                                disabled={sessionData.isActive}
                            >
                                📊 CSV
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => exportReport("json")}
                                disabled={sessionData.isActive}
                            >
                                🔧 JSON
                            </button>
                        </div>
                        {sessionData.isActive && (
                            <small
                                style={{
                                    color: "#6b7280",
                                    display: "block",
                                    marginTop: "0.5rem",
                                }}
                            >
                                Reports available after interview ends
                            </small>
                        )}
                    </div>

                    <div>
                        <h4 style={{ color: "#374151", marginBottom: "1rem" }}>
                            🔗 Session Links
                        </h4>
                        <div
                            style={{
                                background: "#f3f4f6",
                                padding: "1rem",
                                borderRadius: "8px",
                                wordBreak: "break-all",
                            }}
                        >
                            <p
                                style={{
                                    margin: "0 0 0.5rem 0",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <strong>Candidate:</strong>
                                <br />
                                <code
                                    style={{
                                        background: "#e5e7eb",
                                        padding: "0.25rem",
                                        borderRadius: "4px",
                                    }}
                                >
                                    {window.location.origin}/candidate/
                                    {sessionId}
                                </code>
                            </p>
                            <p
                                style={{
                                    margin: "0.5rem 0 0 0",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <strong>Interviewer:</strong>
                                <br />
                                <code
                                    style={{
                                        background: "#e5e7eb",
                                        padding: "0.25rem",
                                        borderRadius: "4px",
                                    }}
                                >
                                    {window.location.href}
                                </code>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Report Modal */}
            {fullReport && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        className="card"
                        style={{
                            maxWidth: "800px",
                            maxHeight: "80vh",
                            overflow: "auto",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "2rem",
                            }}
                        >
                            <h2 style={{ margin: 0 }}>
                                📋 Complete Interview Report
                            </h2>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setFullReport(null)}
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div
                            style={{
                                background: "#f9fafb",
                                padding: "1.5rem",
                                borderRadius: "8px",
                            }}
                        >
                            <h3>Session Summary</h3>
                            <p>
                                <strong>Candidate:</strong>{" "}
                                {fullReport.session.candidateName}
                            </p>
                            <p>
                                <strong>Duration:</strong> {fullReport.duration}{" "}
                                minutes
                            </p>
                            <p>
                                <strong>Final Integrity Score:</strong>
                                <span
                                    style={{
                                        color: getScoreColor(
                                            fullReport.session.integrityScore
                                        ),
                                        fontWeight: "bold",
                                    }}
                                >
                                    {fullReport.session.integrityScore}/100
                                </span>
                            </p>
                            <p>
                                <strong>Total Events:</strong>{" "}
                                {fullReport.totalEvents}
                            </p>
                        </div>

                        <div style={{ marginTop: "2rem" }}>
                            <h3>Event Statistics</h3>
                            {Object.entries(fullReport.eventStats || {}).map(
                                ([type, count]) => (
                                    <p key={type}>
                                        <strong>
                                            {type.replace(/_/g, " ")}:
                                        </strong>{" "}
                                        {String(count)}
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewerDashboard;
