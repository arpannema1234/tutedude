import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";

interface FaceDetectionData {
    facesDetected: number;
    isLookingAway: boolean;
    eyesClosed: boolean;
    confidence: number;
}

interface DetectionEvent {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
}

interface UseComputerVisionProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    sessionId?: string;
    onEvent?: (event: DetectionEvent) => void;
}

export const useComputerVision = ({
    videoRef,
    canvasRef,
    sessionId,
    onEvent,
}: UseComputerVisionProps) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [detectionEnabled, setDetectionEnabled] = useState(false);
    const [timeUntilDetection, setTimeUntilDetection] = useState(5); // Reduced to 5 seconds for testing
    const [faceData, setFaceData] = useState<FaceDetectionData>({
        facesDetected: 0,
        isLookingAway: false,
        eyesClosed: false,
        confidence: 0,
    });

    const faceMeshRef = useRef<FaceMesh | null>(null);
    const lastEventTimeRef = useRef<{ [key: string]: number }>({});
    const noFaceStartTimeRef = useRef<number | null>(null);
    const lookingAwayStartTimeRef = useRef<number | null>(null);
    const eyesClosedStartTimeRef = useRef<number | null>(null);
    const detectionStartTimeRef = useRef<number | null>(null);

    // Initialize MediaPipe FaceMesh
    useEffect(() => {
        const initializeFaceMesh = async () => {
            try {
                const faceMesh = new FaceMesh({
                    locateFile: (file) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                });

                faceMesh.setOptions({
                    maxNumFaces: 3,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                faceMesh.onResults(onResults);
                faceMeshRef.current = faceMesh;
                setIsInitialized(true);

                // Start the countdown timer when face detection is initialized
                detectionStartTimeRef.current = Date.now();
            } catch (error) {
                console.error("Failed to initialize FaceMesh:", error);
            }
        };

        initializeFaceMesh();

        return () => {
            if (faceMeshRef.current) {
                faceMeshRef.current.close();
            }
        };
    }, []);

    // Countdown timer for detection delay
    useEffect(() => {
        if (!detectionStartTimeRef.current) return;

        const interval = setInterval(() => {
            const elapsed =
                (Date.now() - (detectionStartTimeRef.current || 0)) / 1000;
            const remaining = Math.max(0, 5 - elapsed); // Reduced to 5 seconds for testing

            setTimeUntilDetection(Math.ceil(remaining));

            if (remaining === 0) {
                console.log("Enabling detection after countdown");
                setDetectionEnabled(true);
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isInitialized]);

    // Process video frames
    useEffect(() => {
        let animationFrame: number;

        const processFrame = async () => {
            if (
                faceMeshRef.current &&
                videoRef.current &&
                videoRef.current.readyState === 4 &&
                isInitialized
            ) {
                await faceMeshRef.current.send({ image: videoRef.current });
            }
            animationFrame = requestAnimationFrame(processFrame);
        };

        if (isInitialized) {
            processFrame();
        }

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [isInitialized]);

    const onResults = (results: any) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || !videoRef.current) return;

        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentTime = Date.now();
        const facesDetected = results.multiFaceLandmarks?.length || 0;

        // Always update face data for UI display
        setFaceData((prev) => ({
            ...prev,
            facesDetected,
        }));

        // Only process violations if detection is enabled (after 5 second delay)
        if (detectionEnabled) {
            console.log("Detection enabled, processing violations", {
                facesDetected,
                currentTime: new Date(currentTime).toLocaleTimeString(),
            });
            // Check for multiple faces
            if (facesDetected > 1) {
                triggerEvent(
                    {
                        type: "multiple_faces",
                        description: `${facesDetected} faces detected in frame`,
                        severity: "high",
                    },
                    currentTime
                );
            }

            // Check for no face detected
            if (facesDetected === 0) {
                if (!noFaceStartTimeRef.current) {
                    noFaceStartTimeRef.current = currentTime;
                    console.log("No face detected - starting timer");
                } else if (currentTime - noFaceStartTimeRef.current > 3000) {
                    // 3 seconds (reduced from 10)
                    console.log(
                        "No face for 3+ seconds - triggering violation"
                    );
                    triggerEvent(
                        {
                            type: "no_face",
                            description:
                                "No face detected for more than 3 seconds",
                            severity: "high",
                        },
                        currentTime
                    );
                    // Reset timer to allow continuous violations while face is still missing
                    noFaceStartTimeRef.current = currentTime;
                }
            } else {
                if (noFaceStartTimeRef.current) {
                    console.log("Face detected - resetting no face timer");
                }
                noFaceStartTimeRef.current = null;
            }
        } else {
            // Reset timers during countdown period
            noFaceStartTimeRef.current = null;
        }

        if (facesDetected === 1 && results.multiFaceLandmarks[0]) {
            const landmarks = results.multiFaceLandmarks[0];

            // Draw face landmarks
            drawFaceLandmarks(ctx, landmarks, canvas.width, canvas.height);

            // Calculate face direction and eye states
            const { isLookingAway, eyesClosed, confidence } =
                analyzeFaceLandmarks(landmarks);

            // Update face data
            setFaceData({
                facesDetected,
                isLookingAway,
                eyesClosed,
                confidence,
            });

            // Check for looking away (only if detection enabled)
            if (detectionEnabled) {
                if (isLookingAway) {
                    if (!lookingAwayStartTimeRef.current) {
                        lookingAwayStartTimeRef.current = currentTime;
                        console.log("Looking away detected - starting timer");
                    } else if (
                        currentTime - lookingAwayStartTimeRef.current >
                        2000
                    ) {
                        // 2 seconds (reduced from 5)
                        console.log(
                            "Looking away for 2+ seconds - triggering violation"
                        );
                        triggerEvent(
                            {
                                type: "focus_lost",
                                description:
                                    "Candidate looking away for more than 2 seconds",
                                severity: "medium",
                            },
                            currentTime
                        );
                        // Reset timer to allow continuous violations while still looking away
                        lookingAwayStartTimeRef.current = currentTime;
                    }
                } else {
                    if (lookingAwayStartTimeRef.current) {
                        console.log("Looking back at camera - resetting timer");
                    }
                    lookingAwayStartTimeRef.current = null;
                }
            } else {
                // Reset timers during countdown period
                lookingAwayStartTimeRef.current = null;
            }

            // Check for eyes closed (drowsiness detection) - only if detection enabled
            if (detectionEnabled && eyesClosed) {
                if (!eyesClosedStartTimeRef.current) {
                    eyesClosedStartTimeRef.current = currentTime;
                    console.log("Eyes closed detected - starting timer");
                } else if (
                    currentTime - eyesClosedStartTimeRef.current >
                    3000
                ) {
                    // 3 seconds
                    console.log(
                        "Eyes closed for 3+ seconds - triggering violation"
                    );
                    triggerEvent(
                        {
                            type: "drowsiness",
                            description:
                                "Eyes closed for extended period - possible drowsiness",
                            severity: "medium",
                        },
                        currentTime
                    );
                    // Reset timer to allow continuous violations while eyes remain closed
                    eyesClosedStartTimeRef.current = currentTime;
                }
            } else {
                if (eyesClosedStartTimeRef.current) {
                    console.log("Eyes opened - resetting timer");
                }
                eyesClosedStartTimeRef.current = null;
            }
        }
    };

    const drawFaceLandmarks = (
        ctx: CanvasRenderingContext2D,
        _landmarks: any[],
        width: number,
        height: number
    ) => {
        // Clear the canvas but don't draw any overlays
        ctx.clearRect(0, 0, width, height);

        // Face detection is still running in the background for analysis
        // but no visual indicators are drawn on the canvas
    };

    const analyzeFaceLandmarks = (landmarks: any[]) => {
        // Nose tip
        const noseTip = landmarks[1];

        // Eye landmarks for gaze direction
        const leftEyeInner = landmarks[133];
        const rightEyeOuter = landmarks[263];

        // Eye landmarks for blink detection
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];

        // Calculate eye openness (Eye Aspect Ratio approximation)
        const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        const eyeOpenness = (leftEyeHeight + rightEyeHeight) / 2;

        // Threshold for closed eyes (adjust based on testing)
        const eyesClosed = eyeOpenness < 0.02;

        // Calculate gaze direction (simplified)
        const faceCenter = {
            x: (leftEyeInner.x + rightEyeOuter.x) / 2,
            y: (leftEyeInner.y + rightEyeOuter.y) / 2,
        };

        // Check if looking significantly away from center
        const horizontalDeviation = Math.abs(noseTip.x - faceCenter.x);
        const verticalDeviation = Math.abs(noseTip.y - faceCenter.y);

        const isLookingAway =
            horizontalDeviation > 0.1 || verticalDeviation > 0.1;

        // Calculate confidence based on landmark quality
        const confidence = landmarks.length > 400 ? 0.9 : 0.6;

        return {
            isLookingAway,
            eyesClosed,
            confidence,
        };
    };

    const triggerEvent = async (event: DetectionEvent, currentTime: number) => {
        // Prevent spam - only trigger same event type once per 5 seconds
        const lastEventTime = lastEventTimeRef.current[event.type] || 0;
        if (currentTime - lastEventTime < 5000) {
            console.log(
                `Throttled ${event.type} - last trigger was ${
                    (currentTime - lastEventTime) / 1000
                }s ago`
            );
            return;
        }

        lastEventTimeRef.current[event.type] = currentTime;

        console.log("Triggering violation:", event);

        // Call local event handler
        if (onEvent) {
            onEvent(event);
        }

        // Send to backend if sessionId provided
        if (sessionId) {
            try {
                const response = await fetch(
                    `${
                        import.meta.env.VITE_BACKEND_URL
                    }/api/session/${sessionId}/event`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(event),
                    }
                );
                const result = await response.json();
                console.log("Backend response:", result);
            } catch (error) {
                console.error("Failed to send event to backend:", error);
            }
        }
    };

    return {
        isInitialized,
        faceData,
        detectionEnabled,
        timeUntilDetection,
        triggerEvent: (event: DetectionEvent) =>
            triggerEvent(event, Date.now()),
        // Test function to manually trigger violations
        testViolation: () => {
            console.log("Testing manual violation");
            triggerEvent(
                {
                    type: "test_violation",
                    description: "Manual test violation",
                    severity: "high",
                },
                Date.now()
            );
        },
        // Force immediate check for face
        forceCheck: () => {
            const currentTime = Date.now();
            console.log("Force checking face detection...", {
                detectionEnabled,
                currentFaceData: faceData,
            });

            if (detectionEnabled && faceData.facesDetected === 0) {
                console.log("No face detected - forcing violation");
                triggerEvent(
                    {
                        type: "no_face",
                        description: "No face detected (forced check)",
                        severity: "high",
                    },
                    currentTime
                );
            }
        },
        // Test all violation types
        testAllViolations: async () => {
            const violations = [
                {
                    type: "no_face",
                    description: "No face detected (TEST)",
                    severity: "high",
                },
                {
                    type: "multiple_faces",
                    description: "Multiple faces detected (TEST)",
                    severity: "high",
                },
                {
                    type: "focus_lost",
                    description: "Looking away (TEST)",
                    severity: "medium",
                },
                {
                    type: "drowsiness",
                    description: "Eyes closed (TEST)",
                    severity: "medium",
                },
                {
                    type: "object_detected",
                    description: "Cell phone detected (TEST)",
                    severity: "high",
                },
            ];

            for (let i = 0; i < violations.length; i++) {
                console.log(
                    `Testing violation ${i + 1}/${violations.length}:`,
                    violations[i]
                );
                await triggerEvent(violations[i] as DetectionEvent, Date.now());
                // Wait 1 second between violations
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        },
    };
};
