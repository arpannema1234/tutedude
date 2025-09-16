import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";

interface FaceDetectionData {
    facesDetected: number;
    isLookingAway: boolean;
    eyesClosed: boolean;
    confidence: number;
}

export interface DetectionEvent {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
}

interface UseComputerVisionProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useComputerVision = ({
    videoRef,
    canvasRef,
}: UseComputerVisionProps) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [faceData, setFaceData] = useState<FaceDetectionData>({
        facesDetected: 0,
        isLookingAway: false,
        eyesClosed: false,
        confidence: 0,
    });

    const faceMeshRef = useRef<FaceMesh | null>(null);

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
                    minDetectionConfidence: 0.8,
                    minTrackingConfidence: 0.8,
                });

                faceMesh.onResults(onResults);
                faceMeshRef.current = faceMesh;
                setIsInitialized(true);
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

        const facesDetected = results.multiFaceLandmarks?.length || 0;

        // Always update face data for UI display
        setFaceData((prev) => ({
            ...prev,
            facesDetected,
        }));

        if (facesDetected === 1 && results.multiFaceLandmarks[0]) {
            const landmarks = results.multiFaceLandmarks[0];

            // Draw face landmarks
            drawFaceLandmarks(ctx, landmarks, canvas.width, canvas.height);

            // Calculate face direction and eye states
            const { isLookingAway, eyesClosed, confidence } =
                analyzeFaceLandmarks(landmarks);

            // Update face data with all detected states
            setFaceData({
                facesDetected,
                isLookingAway,
                eyesClosed,
                confidence,
            });
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

    return {
        isInitialized,
        faceData,
    };
};
