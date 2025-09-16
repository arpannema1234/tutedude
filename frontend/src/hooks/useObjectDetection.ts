import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

interface DetectedObject {
    class: string;
    score: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
}

interface ObjectDetectionData {
    objects: DetectedObject[];
    suspiciousObjects: DetectedObject[];
    isDetecting: boolean;
}

interface DetectionEvent {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
}

interface UseObjectDetectionProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    sessionId?: string;
    onEvent?: (event: DetectionEvent) => void;
    enabled?: boolean;
    detectionEnabled?: boolean;
}

export const useObjectDetection = ({
    videoRef,
    canvasRef,
    sessionId,
    onEvent,
    enabled = true,
    detectionEnabled = true,
}: UseObjectDetectionProps) => {
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [detectionData, setDetectionData] = useState<ObjectDetectionData>({
        objects: [],
        suspiciousObjects: [],
        isDetecting: false,
    });

    const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastEventTimeRef = useRef<{ [key: string]: number }>({});

    // Suspicious object classes to detect
    const suspiciousClasses = [
        "cell phone",
        "book",
        "laptop",
        "keyboard",
        "mouse",
        "remote",
        "scissors",
        "teddy bear", // Sometimes notebooks are classified as this
        "vase", // Sometimes phones are misclassified
        "bottle", // Sometimes small objects
        "cup", // Sometimes small objects
        "tablet", // Tablets
        "tv", // TV or monitor
        "microwave", // Sometimes tablets are misclassified
        "toaster", // Sometimes electronic devices
        "clock", // Digital clocks/devices
    ];

    // Initialize TensorFlow and load model
    useEffect(() => {
        const initializeModel = async () => {
            try {
                // Initialize TensorFlow
                await tf.ready();

                // Load COCO-SSD model
                // console.log("Loading object detection model...");
                const loadedModel = await cocoSsd.load({
                    modelUrl:
                        "https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1",
                    base: "mobilenet_v2",
                });

                setModel(loadedModel);
                setIsLoaded(true);
                // console.log("Object detection model loaded successfully");
            } catch (error) {
                console.error("Failed to load object detection model:", error);
            }
        };

        if (enabled) {
            initializeModel();
        }

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [enabled]);

    // Start/stop detection based on model loading and enabled state
    useEffect(() => {
        if (model && isLoaded && enabled && videoRef.current) {
            startDetection();
        } else {
            stopDetection();
        }

        return () => {
            stopDetection();
        };
    }, [model, isLoaded, enabled]);

    const startDetection = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }

        setDetectionData((prev) => ({ ...prev, isDetecting: true }));

        // Run detection every 3 seconds to balance performance and accuracy
        detectionIntervalRef.current = setInterval(async () => {
            await performDetection();
        }, 3000);
    };

    const stopDetection = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        setDetectionData((prev) => ({ ...prev, isDetecting: false }));
    };

    const performDetection = async () => {
        if (!model || !videoRef.current || !canvasRef.current) {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        try {
            // Perform object detection
            const predictions = await model.detect(video);

            // Filter and process predictions
            const detectedObjects: DetectedObject[] = predictions.map(
                (prediction) => ({
                    class: prediction.class,
                    score: prediction.score,
                    bbox: prediction.bbox as [number, number, number, number],
                })
            );

            // Identify suspicious objects
            const suspicious = detectedObjects.filter(
                (obj) =>
                    suspiciousClasses.includes(obj.class.toLowerCase()) &&
                    obj.score > 0.6
            );

            // Update detection data
            setDetectionData({
                objects: detectedObjects,
                suspiciousObjects: suspicious,
                isDetecting: true,
            });

            // Draw detections on canvas
            drawDetections(canvas, detectedObjects, suspicious);

            // Trigger events for suspicious objects (only if detection is enabled)
            if (detectionEnabled) {
                await processSuspiciousObjects(suspicious);
            }
        } catch (error) {
            console.error("Error during object detection:", error);
        }
    };

    const drawDetections = (
        canvas: HTMLCanvasElement,
        objects: DetectedObject[],
        suspicious: DetectedObject[]
    ) => {
        const ctx = canvas.getContext("2d");
        if (!ctx || !videoRef.current) return;

        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Clear previous drawings (but preserve face detection if any)
        // We'll only draw our object detection boxes

        objects.forEach((obj) => {
            const [x, y, width, height] = obj.bbox;
            const isSuspicious = suspicious.some((s) => s === obj);

            // Draw bounding box
            ctx.strokeStyle = isSuspicious ? "#ff0000" : "#00ff00";
            ctx.lineWidth = isSuspicious ? 3 : 2;
            ctx.strokeRect(x, y, width, height);

            // Draw label background
            const labelText = `${obj.class} ${Math.round(obj.score * 100)}%`;
            ctx.font = "16px Arial";
            const textMetrics = ctx.measureText(labelText);
            const labelHeight = 20;

            ctx.fillStyle = isSuspicious ? "#ff0000" : "#00ff00";
            ctx.fillRect(
                x,
                y - labelHeight,
                textMetrics.width + 10,
                labelHeight
            );

            // Draw label text
            ctx.fillStyle = "#ffffff";
            ctx.fillText(labelText, x + 5, y - 5);
        });
    };

    const processSuspiciousObjects = async (suspicious: DetectedObject[]) => {
        const currentTime = Date.now();

        for (const obj of suspicious) {
            const eventKey = `object_${obj.class}`;
            const lastEventTime = lastEventTimeRef.current[eventKey] || 0;

            // Only trigger event once per 8 seconds for same object type
            if (currentTime - lastEventTime < 8000) {
                continue;
            }

            lastEventTimeRef.current[eventKey] = currentTime;

            const severity = getSeverity(obj.class);
            const event: DetectionEvent = {
                type: "object_detected",
                description: `${obj.class} detected in frame (${Math.round(
                    obj.score * 100
                )}% confidence)`,
                severity,
            };

            console.log("Triggering object violation:", event);

            // Trigger event handlers
            if (onEvent) {
                onEvent(event);
            }

            // Send to backend (fire and forget - don't block detection)
            if (sessionId) {
                fetch(
                    `${
                        import.meta.env.VITE_BACKEND_URL
                    }/api/session/${sessionId}/event`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(event),
                        signal: AbortSignal.timeout(2000), // 2 second timeout
                    }
                )
                    .then((response) => {
                        if (response.ok) {
                            console.log(
                                "Object detection event sent to backend"
                            );
                        }
                    })
                    .catch(() => {
                        // Silently handle backend failures - continue with local detection
                        console.log(
                            "Object detection continuing locally - backend unavailable"
                        );
                    });
            }
        }
    };

    const getSeverity = (objectClass: string): "low" | "medium" | "high" => {
        const highRisk = [
            "cell phone",
            "laptop",
            "keyboard",
            "mouse",
            "tablet",
            "tv",
            "microwave", // Sometimes tablets misclassified
        ];
        const mediumRisk = ["book", "remote", "scissors", "clock"];
        const lowRisk = [
            "teddy bear", // Sometimes notebooks
            "vase",
            "bottle",
            "cup",
            "toaster",
        ];

        const lowerClass = objectClass.toLowerCase();

        if (highRisk.includes(lowerClass)) {
            return "high"; // 10 point deduction
        } else if (mediumRisk.includes(lowerClass)) {
            return "medium"; // 5 point deduction
        } else if (lowRisk.includes(lowerClass)) {
            return "low"; // 2 point deduction
        }
        return "low"; // Default to low risk
    };

    const toggleDetection = () => {
        if (detectionData.isDetecting) {
            stopDetection();
        } else {
            startDetection();
        }
    };

    return {
        isLoaded,
        detectionData,
        toggleDetection,
        suspiciousClasses,
    };
};
