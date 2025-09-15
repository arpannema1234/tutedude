import React, { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useComputerVision } from "../hooks/useComputerVision";
import { useObjectDetection } from "../hooks/useObjectDetection";
import { generatePDFReport } from "../utils/reportGenerator";

interface CandidateViewProps {}

const CandidateView: React.FC<CandidateViewProps> = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const [isRecording, setIsRecording] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<
        "requesting" | "granted" | "denied"
    >("requesting");
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    const [currentStatus, setCurrentStatus] = useState("Initializing...");
    const [localEvents, setLocalEvents] = useState<any[]>([]);
    const [showReport, setShowReport] = useState(false);
    const [finalReport, setFinalReport] = useState<any>(null);
    const [currentScore, setCurrentScore] = useState<number>(100); // Local score state
    const [scoreChanged, setScoreChanged] = useState<boolean>(false); // For highlighting score changes
    const [scoreHistory, setScoreHistory] = useState<
        Array<{
            score: number;
            deduction: number;
            reason: string;
            timestamp: Date;
        }>
    >([]);
    const navigate = useNavigate();

    // Initialize computer vision
    const {
        isInitialized: cvInitialized,
        faceData,
        detectionEnabled,
        timeUntilDetection,
        // testViolation,
        // testAllViolations,
        // forceCheck,
    } = useComputerVision({
        videoRef: videoRef as React.RefObject<HTMLVideoElement>,
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
        sessionId,
        onEvent: (event) => {
            // Calculate deduction amount
            const deductionAmounts = { low: 2, medium: 5, high: 10 };
            const deduction =
                deductionAmounts[
                    event.severity as keyof typeof deductionAmounts
                ] || 5;

            console.log(
                `Violation detected: ${event.type} (${event.severity}) - deducting ${deduction} points`
            );

            // Update local score immediately
            setCurrentScore((prev) => {
                const newScore = Math.max(0, prev - deduction);
                console.log(
                    `Score Update: ${prev} - ${deduction} = ${newScore}`
                );

                // Highlight score change
                setScoreChanged(true);
                setTimeout(() => setScoreChanged(false), 2000);

                // Add to score history
                setScoreHistory((prevHistory) => [
                    ...prevHistory.slice(-9), // Keep last 10 entries
                    {
                        score: newScore,
                        deduction,
                        reason: event.description,
                        timestamp: new Date(),
                    },
                ]);
                return newScore;
            });

            // Show toast notification for violations with point deduction
            const emojis = {
                focus_lost: "👀",
                no_face: "❌",
                multiple_faces: "👥",
                object_detected: "📱",
                drowsiness: "😴",
            };

            const emoji = emojis[event.type as keyof typeof emojis] || "⚠️";
            toast(`${emoji} ${event.description} (-${deduction} points)`, {
                style: {
                    background:
                        event.severity === "high"
                            ? "#ef4444"
                            : event.severity === "medium"
                            ? "#f59e0b"
                            : "#3b82f6",
                    color: "#fff",
                },
                duration: 4000,
            });

            // Add to local events for immediate display
            setLocalEvents((prev) => [
                ...prev.slice(-4),
                { ...event, timestamp: new Date().toISOString(), deduction },
            ]);
        },
    });

    // Initialize object detection
    const { isLoaded: objDetectionLoaded, detectionData } = useObjectDetection({
        videoRef: videoRef as React.RefObject<HTMLVideoElement>,
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
        sessionId,
        enabled: cvInitialized, // Only start after face detection is ready
        detectionEnabled, // Pass the detection enabled status
        onEvent: (event) => {
            // Calculate deduction amount for object detection
            const deductionAmounts = { low: 2, medium: 5, high: 10 };
            const deduction =
                deductionAmounts[
                    event.severity as keyof typeof deductionAmounts
                ] || 5;

            console.log(
                `Object violation detected: ${event.type} (${event.severity}) - deducting ${deduction} points`
            );

            // Update local score immediately
            setCurrentScore((prev) => {
                const newScore = Math.max(0, prev - deduction);
                console.log(
                    `Object Score Update: ${prev} - ${deduction} = ${newScore}`
                );

                // Add to score history
                setScoreHistory((prevHistory) => [
                    ...prevHistory.slice(-9), // Keep last 10 entries
                    {
                        score: newScore,
                        deduction,
                        reason: event.description,
                        timestamp: new Date(),
                    },
                ]);
                return newScore;
            });

            // Show toast notification for object violations with point deduction
            const emoji = "📱";
            toast(`${emoji} ${event.description} (-${deduction} points)`, {
                style: {
                    background: "#ef4444",
                    color: "#fff",
                },
                duration: 4000,
            });

            // Add to local events for immediate display
            setLocalEvents((prev) => [
                ...prev.slice(-4),
                { ...event, timestamp: new Date().toISOString(), deduction },
            ]);
        },
    });

    // Show toast when detection starts
    useEffect(() => {
        if (detectionEnabled && cvInitialized) {
            toast.success(
                "🔍 Proctoring is now active! Please follow all guidelines.",
                {
                    duration: 4000,
                    style: {
                        background: "#10b981",
                        color: "#fff",
                    },
                }
            );
        }
    }, [detectionEnabled, cvInitialized]);

    // Initialize camera and start recording
    useEffect(() => {
        let stream: MediaStream | null = null;

        const initializeCamera = async () => {
            try {
                setCurrentStatus("Requesting camera permission...");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                    },
                    audio: true,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setPermissionStatus("granted");
                    setCurrentStatus("Camera ready");

                    // Start recording automatically
                    startRecording(stream);
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                setPermissionStatus("denied");
                setCurrentStatus("Camera access denied");
            }
        };

        initializeCamera();

        // Cleanup
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Fetch session info
    useEffect(() => {
        if (sessionId) {
            fetchSessionInfo();
            const interval = setInterval(fetchSessionInfo, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [sessionId]);

    const fetchSessionInfo = async () => {
        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/status`
            );
            const data = await response.json();
            if (data.sessionId) {
                setSessionInfo(data);
                // Only sync if backend score is lower (more deductions) or if local score is still at initial 100
                // This prevents backend from overriding immediate local deductions
                if (
                    currentScore === 100 ||
                    data.integrityScore < currentScore
                ) {
                    console.log(
                        `Syncing score: local=${currentScore}, backend=${data.integrityScore}`
                    );
                    setCurrentScore(data.integrityScore);
                }
            }
        } catch (error) {
            console.error("Error fetching session info:", error);
        }
    };

    const startRecording = (stream: MediaStream) => {
        try {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp9",
            });

            mediaRecorderRef.current = mediaRecorder;
            recordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                uploadRecording();
            };

            mediaRecorder.start(1000); // Record in 1-second chunks
            setIsRecording(true);
            setCurrentStatus("Recording in progress...");
        } catch (error) {
            console.error("Error starting recording:", error);
            setCurrentStatus("Recording failed to start");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setCurrentStatus("Processing recording...");
        }
    };

    const uploadRecording = async () => {
        if (recordedChunksRef.current.length === 0) return;

        const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
        });
        const formData = new FormData();
        formData.append(
            "video",
            blob,
            `interview-${sessionId}-${Date.now()}.webm`
        );

        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/upload-video`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (response.ok) {
                console.log("Video uploaded successfully");
                setCurrentStatus("Video saved successfully");
            }
        } catch (error) {
            console.error("Error uploading video:", error);
            setCurrentStatus("Failed to save video");
        }
    };

    const endInterview = async () => {
        try {
            stopRecording();

            const response = await fetch(
                `${
                    import.meta.env.VITE_BACKEND_URL
                }/api/session/${sessionId}/end`,
                {
                    method: "PATCH",
                }
            );

            if (response.ok) {
                setCurrentStatus("Interview ended - Loading report...");

                // Fetch final report
                const reportResponse = await fetch(
                    `${
                        import.meta.env.VITE_BACKEND_URL
                    }/api/session/${sessionId}/report`
                );
                const reportData = await reportResponse.json();

                setFinalReport(reportData);
                setShowReport(true);

                toast.success("Interview completed! Check your report below.", {
                    duration: 6000,
                });
            }
        } catch (error) {
            console.error("Error ending interview:", error);
            toast.error("Failed to end interview. Please try again.");
        }
    };

    if (permissionStatus === "denied") {
        return (
            <div
                className="card"
                style={{
                    textAlign: "center",
                    maxWidth: "600px",
                    margin: "2rem auto",
                }}
            >
                <h2 style={{ color: "#ef4444" }}>❌ Camera Access Required</h2>
                <p>
                    This interview requires camera access for proctoring.
                    Please:
                </p>
                <ol style={{ textAlign: "left", margin: "1rem 0" }}>
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera and microphone access</li>
                    <li>Refresh this page to try again</li>
                </ol>
                <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    🔄 Try Again
                </button>
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
                            📹 Video Interview Session
                        </h2>
                        {sessionInfo && (
                            <p
                                style={{
                                    margin: "0.5rem 0 0 0",
                                    color: "#6b7280",
                                }}
                            >
                                <strong>{sessionInfo.candidateName}</strong> |
                                Current Score:{" "}
                                <strong
                                    style={{
                                        color:
                                            currentScore >= 80
                                                ? "#10b981"
                                                : currentScore >= 60
                                                ? "#f59e0b"
                                                : "#ef4444",
                                        transition: "all 0.3s ease",
                                        backgroundColor: scoreChanged
                                            ? "#fef3c7"
                                            : "transparent",
                                        padding: scoreChanged
                                            ? "0.2rem 0.4rem"
                                            : "0",
                                        borderRadius: scoreChanged
                                            ? "4px"
                                            : "0",
                                    }}
                                >
                                    {currentScore}/100
                                </strong>
                                {scoreHistory.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "#ef4444",
                                            marginLeft: "0.5rem",
                                        }}
                                    >
                                        (Last: -
                                        {
                                            scoreHistory[
                                                scoreHistory.length - 1
                                            ]?.deduction
                                        }{" "}
                                        pts)
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                        }}
                    >
                        <span
                            className={`status-indicator ${
                                isRecording ? "danger" : "neutral"
                            }`}
                        >
                            {isRecording ? "🔴 Recording" : "⏸️ Not Recording"}
                        </span>
                        {/* <button
                            className="btn btn-secondary"
                            onClick={() => testViolation()}
                            style={{ marginRight: "0.5rem" }}
                        >
                            🧪 Test Single
                        </button>
                        <button
                            className="btn btn-warning"
                            onClick={() => testAllViolations()}
                            style={{ marginRight: "0.5rem" }}
                        >
                            🔥 Test All (-35pts)
                        </button>
                        <button
                            className="btn btn-info"
                            onClick={() => forceCheck()}
                            style={{ marginRight: "0.5rem" }}
                        >
                            👁️ Force Check
                        </button> */}
                        <button
                            className="btn btn-danger"
                            onClick={endInterview}
                            disabled={!sessionInfo?.isActive}
                        >
                            🏁 Finish & View Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Video and Canvas Container */}
            <div className="grid grid-2">
                {/* Candidate Video */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>📱 Your Video</h3>
                    <div className="video-container" style={{ width: "100%" }}>
                        <video
                            ref={videoRef}
                            className="video-feed"
                            autoPlay
                            muted
                            playsInline
                            style={{
                                width: "100%",
                                height: "300px",
                                objectFit: "cover",
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="video-overlay"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </div>
                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <span
                                className={`status-indicator ${
                                    permissionStatus === "granted"
                                        ? "active"
                                        : "warning"
                                }`}
                            >
                                {currentStatus}
                            </span>
                            {!detectionEnabled && timeUntilDetection > 0 && (
                                <span className="status-indicator warning">
                                    ⏳ Detection starts in {timeUntilDetection}s
                                </span>
                            )}
                            {detectionEnabled && (
                                <span className="status-indicator active">
                                    🔍 Proctoring Active
                                </span>
                            )}
                            {cvInitialized && (
                                <>
                                    <span
                                        className={`status-indicator ${
                                            faceData.facesDetected === 1
                                                ? "active"
                                                : faceData.facesDetected > 1
                                                ? "danger"
                                                : "warning"
                                        }`}
                                    >
                                        {faceData.facesDetected === 0
                                            ? "❌ No Face"
                                            : faceData.facesDetected === 1
                                            ? "✅ Face Detected"
                                            : `⚠️ ${faceData.facesDetected} Faces`}
                                    </span>
                                    {faceData.eyesClosed && (
                                        <span className="status-indicator warning">
                                            😴 Eyes Closed
                                        </span>
                                    )}
                                </>
                            )}
                            {objDetectionLoaded && (
                                <>
                                    <span
                                        className={`status-indicator ${
                                            detectionData.isDetecting
                                                ? "active"
                                                : "neutral"
                                        }`}
                                    >
                                        {detectionData.isDetecting
                                            ? "🔍 Scanning Objects"
                                            : "⏸️ Object Detection Off"}
                                    </span>
                                    {detectionData.suspiciousObjects.length >
                                        0 && (
                                        <span className="status-indicator danger">
                                            ⚠️{" "}
                                            {
                                                detectionData.suspiciousObjects
                                                    .length
                                            }{" "}
                                            Suspicious Object(s)
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>📋 Guidelines & Status</h3>
                    <div
                        style={{
                            background: "#f9fafb",
                            padding: "1rem",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                        }}
                    >
                        <h4
                            style={{ margin: "0 0 0.5rem 0", color: "#374151" }}
                        >
                            ✅ Do:
                        </h4>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: "1.5rem",
                                color: "#6b7280",
                            }}
                        >
                            <li>Look directly at the camera</li>
                            <li>Keep your face visible at all times</li>
                            <li>Stay in a well-lit room</li>
                            <li>Sit upright and maintain good posture</li>
                        </ul>

                        {!detectionEnabled && (
                            <div
                                style={{
                                    background: "#f0f9ff",
                                    padding: "0.75rem",
                                    borderRadius: "6px",
                                    marginTop: "1rem",
                                    border: "1px solid #3b82f6",
                                }}
                            >
                                <strong style={{ color: "#1e40af" }}>
                                    ℹ️ Detection Grace Period:
                                </strong>
                                <p
                                    style={{
                                        margin: "0.5rem 0 0 0",
                                        color: "#1e40af",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    You have {timeUntilDetection} seconds to get
                                    comfortable. Violation tracking will begin
                                    automatically.
                                </p>
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            background: "#fef2f2",
                            padding: "1rem",
                            borderRadius: "8px",
                        }}
                    >
                        <h4
                            style={{ margin: "0 0 0.5rem 0", color: "#ef4444" }}
                        >
                            ❌ Don't:
                        </h4>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: "1.5rem",
                                color: "#6b7280",
                            }}
                        >
                            <li>Use mobile phones or electronic devices</li>
                            <li>Refer to books, notes, or papers</li>
                            <li>Look away from camera for extended periods</li>
                            <li>Have other people in the frame</li>
                        </ul>
                    </div>

                    {objDetectionLoaded && detectionData.objects.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                            <h4 style={{ color: "#374151" }}>
                                🔍 Currently Detected:
                            </h4>
                            <div
                                style={{
                                    background: "#f3f4f6",
                                    padding: "0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.875rem",
                                }}
                            >
                                {detectionData.objects.map((obj, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            display: "inline-block",
                                            margin: "0.25rem",
                                            padding: "0.25rem 0.5rem",
                                            background:
                                                detectionData.suspiciousObjects.includes(
                                                    obj
                                                )
                                                    ? "#fef2f2"
                                                    : "#f0f9ff",
                                            color: detectionData.suspiciousObjects.includes(
                                                obj
                                            )
                                                ? "#dc2626"
                                                : "#1e40af",
                                            borderRadius: "12px",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {obj.class} (
                                        {Math.round(obj.score * 100)}%)
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {(sessionInfo?.recentEvents?.length > 0 ||
                        localEvents.length > 0) && (
                        <div style={{ marginTop: "1rem" }}>
                            <h4 style={{ color: "#374151" }}>
                                ⚠️ Recent Alerts:
                            </h4>
                            <div
                                style={{ maxHeight: "150px", overflow: "auto" }}
                            >
                                {/* Show local events first (most recent) */}
                                {localEvents
                                    .slice()
                                    .reverse()
                                    .map((event: any, index: number) => (
                                        <div
                                            key={`local-${index}`}
                                            style={{
                                                padding: "0.5rem",
                                                margin: "0.25rem 0",
                                                background:
                                                    event.severity === "high"
                                                        ? "#fef2f2"
                                                        : event.severity ===
                                                          "medium"
                                                        ? "#fffbeb"
                                                        : "#f0f9ff",
                                                borderRadius: "4px",
                                                fontSize: "0.875rem",
                                                color: "#374151",
                                                border: "2px solid #3b82f6", // Highlight local events
                                            }}
                                        >
                                            <strong>
                                                {event.type
                                                    .replace(/_/g, " ")
                                                    .toUpperCase()}
                                                :
                                            </strong>{" "}
                                            {event.description}
                                            {event.deduction && (
                                                <span
                                                    style={{
                                                        color: "#ef4444",
                                                        fontWeight: "bold",
                                                        marginLeft: "0.5rem",
                                                    }}
                                                >
                                                    (-{event.deduction} points)
                                                </span>
                                            )}
                                            <br />
                                            <small style={{ color: "#6b7280" }}>
                                                {new Date(
                                                    event.timestamp
                                                ).toLocaleTimeString()}{" "}
                                                (Live)
                                            </small>
                                        </div>
                                    ))}

                                {/* Show server events */}
                                {sessionInfo?.recentEvents
                                    ?.slice(-5)
                                    .reverse()
                                    .map((event: any, index: number) => (
                                        <div
                                            key={`server-${index}`}
                                            style={{
                                                padding: "0.5rem",
                                                margin: "0.25rem 0",
                                                background:
                                                    event.severity === "high"
                                                        ? "#fef2f2"
                                                        : event.severity ===
                                                          "medium"
                                                        ? "#fffbeb"
                                                        : "#f0f9ff",
                                                borderRadius: "4px",
                                                fontSize: "0.875rem",
                                                color: "#374151",
                                            }}
                                        >
                                            <strong>
                                                {event.type
                                                    .replace(/_/g, " ")
                                                    .toUpperCase()}
                                                :
                                            </strong>{" "}
                                            {event.description}
                                            <br />
                                            <small style={{ color: "#6b7280" }}>
                                                {new Date(
                                                    event.timestamp
                                                ).toLocaleTimeString()}
                                            </small>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Interview Report Modal */}
            {showReport && finalReport && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "2rem",
                    }}
                >
                    <div
                        className="card"
                        style={{
                            maxWidth: "600px",
                            maxHeight: "80vh",
                            overflow: "auto",
                            background: "white",
                            margin: 0,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "2rem",
                                borderBottom: "2px solid #e5e7eb",
                                paddingBottom: "1rem",
                            }}
                        >
                            <h2 style={{ margin: 0, color: "#374151" }}>
                                📊 Interview Report
                            </h2>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate("/")}
                                style={{ padding: "0.5rem 1rem" }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {/* Report Summary */}
                        <div
                            style={{
                                background: "#f9fafb",
                                padding: "1.5rem",
                                borderRadius: "8px",
                                marginBottom: "2rem",
                            }}
                        >
                            <h3
                                style={{
                                    margin: "0 0 1rem 0",
                                    color: "#374151",
                                }}
                            >
                                Summary
                            </h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "1rem",
                                }}
                            >
                                <div>
                                    <p
                                        style={{
                                            margin: "0.5rem 0",
                                            color: "#6b7280",
                                        }}
                                    >
                                        <strong>Name:</strong>{" "}
                                        {finalReport.session.candidateName}
                                    </p>
                                    <p
                                        style={{
                                            margin: "0.5rem 0",
                                            color: "#6b7280",
                                        }}
                                    >
                                        <strong>Duration:</strong>{" "}
                                        {finalReport.duration} minutes
                                    </p>
                                </div>
                                <div>
                                    <p
                                        style={{
                                            margin: "0.5rem 0",
                                            color: "#6b7280",
                                        }}
                                    >
                                        <strong>Total Violations:</strong>{" "}
                                        {finalReport.totalEvents}
                                    </p>
                                    <p style={{ margin: "0.5rem 0" }}>
                                        <strong>Integrity Score:</strong>
                                        <span
                                            style={{
                                                color:
                                                    finalReport.session
                                                        .integrityScore >= 80
                                                        ? "#10b981"
                                                        : finalReport.session
                                                              .integrityScore >=
                                                          60
                                                        ? "#f59e0b"
                                                        : "#ef4444",
                                                fontSize: "1.2em",
                                                fontWeight: "bold",
                                                marginLeft: "0.5rem",
                                            }}
                                        >
                                            {finalReport.session.integrityScore}
                                            /100
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Score Interpretation */}
                        <div style={{ marginBottom: "2rem" }}>
                            <h4 style={{ color: "#374151" }}>
                                Score Interpretation:
                            </h4>
                            <div
                                style={{
                                    padding: "1rem",
                                    borderRadius: "8px",
                                    background:
                                        finalReport.session.integrityScore >= 80
                                            ? "#f0fdf4"
                                            : finalReport.session
                                                  .integrityScore >= 60
                                            ? "#fffbeb"
                                            : "#fef2f2",
                                    border: `2px solid ${
                                        finalReport.session.integrityScore >= 80
                                            ? "#10b981"
                                            : finalReport.session
                                                  .integrityScore >= 60
                                            ? "#f59e0b"
                                            : "#ef4444"
                                    }`,
                                }}
                            >
                                <p style={{ margin: 0, color: "#374151" }}>
                                    {finalReport.session.integrityScore >= 80
                                        ? "✅ Excellent - No significant violations detected"
                                        : finalReport.session.integrityScore >=
                                          60
                                        ? "⚠️ Good - Minor violations detected"
                                        : "❌ Poor - Multiple violations detected"}
                                </p>
                            </div>
                        </div>

                        {/* Violation Breakdown */}
                        {finalReport.eventStats &&
                            Object.keys(finalReport.eventStats).length > 0 && (
                                <div style={{ marginBottom: "2rem" }}>
                                    <h4 style={{ color: "#374151" }}>
                                        Violation Breakdown:
                                    </h4>
                                    <div
                                        style={{
                                            background: "#f3f4f6",
                                            padding: "1rem",
                                            borderRadius: "8px",
                                        }}
                                    >
                                        {Object.entries(
                                            finalReport.eventStats
                                        ).map(([type, count]) => (
                                            <div
                                                key={type}
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    marginBottom: "0.5rem",
                                                    padding: "0.5rem",
                                                    background: "white",
                                                    borderRadius: "4px",
                                                }}
                                            >
                                                <span
                                                    style={{ color: "#374151" }}
                                                >
                                                    {type
                                                        .replace(/_/g, " ")
                                                        .toUpperCase()}
                                                </span>
                                                <span
                                                    style={{
                                                        fontWeight: "bold",
                                                        color: "#ef4444",
                                                    }}
                                                >
                                                    {String(count)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: "flex",
                                gap: "1rem",
                                justifyContent: "center",
                            }}
                        >
                            <button
                                className="btn btn-primary"
                                onClick={() => generatePDFReport(finalReport)}
                            >
                                📄 Download PDF Report
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate("/")}
                            >
                                🏠 Start New Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateView;
