# Video Proctoring Violation System

## 🎯 **Point Deduction System**

Each violation automatically deducts points from the candidate's integrity score (starts at 100):

### **HIGH SEVERITY VIOLATIONS (-10 Points Each)**

-   **No Face Detected**: When no face is visible for more than 3 seconds
-   **Multiple Faces**: When more than one person is detected in frame
-   **Electronic Devices**: Cell phone, laptop, keyboard, mouse, tablet, TV detected
-   **Test Violations**: Manual test violations

### **MEDIUM SEVERITY VIOLATIONS (-5 Points Each)**

-   **Looking Away**: Candidate looking away from camera for more than 2 seconds
-   **Drowsiness**: Eyes closed for more than 3 seconds
-   **Suspicious Items**: Books, remote controls, scissors detected

### **LOW SEVERITY VIOLATIONS (-2 Points Each)**

-   **Ambiguous Objects**: Items that might be suspicious (bottles, cups, etc.)
-   **Misclassified Items**: Objects sometimes misidentified by AI

## 🛡️ **Detection Features**

### **Face Detection (MediaPipe FaceMesh)**

-   ✅ Real-time face tracking and counting
-   ✅ Gaze direction analysis
-   ✅ Eye state monitoring (open/closed)
-   ✅ Multiple face detection
-   ✅ Face absence detection

### **Object Detection (TensorFlow COCO-SSD)**

-   ✅ Real-time object recognition
-   ✅ Device detection (phones, laptops, etc.)
-   ✅ Book and paper detection
-   ✅ Confidence scoring
-   ✅ Bounding box visualization

### **Smart Throttling System**

-   Face violations: Max 1 per 10 seconds per violation type
-   Object violations: Max 1 per 8 seconds per object type
-   Prevents spam while maintaining accuracy

## ⏱️ **Detection Timeline**

1. **0-5 seconds**: Grace period - detection initializing, no violations recorded
2. **5+ seconds**: Full proctoring active, all violations tracked and scored
3. **Real-time**: Instant toast notifications for violations
4. **Continuous**: Score updates sent to backend immediately

## 🧪 **Testing Features**

### **Manual Testing Buttons**

-   **🧪 Test Single**: Triggers one high-severity test violation (-10 points)
-   **🔥 Test All (-35pts)**: Tests all violation types sequentially:
    1. No Face Detected (-10pts)
    2. Multiple Faces (-10pts)
    3. Looking Away (-5pts)
    4. Eyes Closed (-5pts)
    5. Device Detected (-5pts)

## 📊 **Scoring Interpretation**

-   **90-100**: Excellent integrity, minimal violations
-   **80-89**: Good integrity, minor issues detected
-   **70-79**: Moderate concerns, some violations occurred
-   **60-69**: Significant violations, integrity compromised
-   **Below 60**: Poor integrity, multiple serious violations

## 🔄 **Real-time Updates**

-   Backend logs every violation with score changes
-   Frontend shows live integrity score updates
-   Toast notifications for immediate feedback
-   Final report includes complete violation breakdown

## 🛠️ **Technical Implementation**

```javascript
// Backend Point Deduction
const deductions = {
    low: 2, // Minor violations
    medium: 5, // Moderate violations
    high: 10, // Severe violations
};

// Score Calculation
newScore = Math.max(0, currentScore - deductionAmount);
```

## 🚀 **Usage Instructions**

1. Start interview session
2. Wait 5 seconds for detection to activate
3. System monitors automatically
4. Violations trigger immediate point deduction
5. Final score shown in interview report
