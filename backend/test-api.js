// Simple API test script for the proctoring backend
const axios = require("axios");

const BASE_URL = "http://localhost:5000";

async function testAPI() {
    console.log("🧪 Testing Tutedude Proctoring API...\n");

    try {
        // Test 1: Create a new session
        console.log("1. Creating new interview session...");
        const sessionResponse = await axios.post(
            `${BASE_URL}/api/session/start`,
            {
                candidateName: "Test User",
                interviewerId: "TEST_001",
            }
        );

        const sessionId = sessionResponse.data.sessionId;
        console.log("✅ Session created:", sessionId);

        // Test 2: Get session status
        console.log("\n2. Getting session status...");
        const statusResponse = await axios.get(
            `${BASE_URL}/api/session/${sessionId}/status`
        );
        console.log("✅ Session status:", {
            candidate: statusResponse.data.candidateName,
            score: statusResponse.data.integrityScore,
            isActive: statusResponse.data.isActive,
        });

        // Test 3: Log a violation event
        console.log("\n3. Logging violation event...");
        const eventResponse = await axios.post(
            `${BASE_URL}/api/session/${sessionId}/event`,
            {
                type: "focus_lost",
                description: "Test violation - looking away",
                severity: "medium",
            }
        );
        console.log(
            "✅ Event logged, new score:",
            eventResponse.data.integrityScore
        );

        // Test 4: End session
        console.log("\n4. Ending interview session...");
        await axios.patch(`${BASE_URL}/api/session/${sessionId}/end`);
        console.log("✅ Session ended successfully");

        // Test 5: Get final report
        console.log("\n5. Getting final report...");
        const reportResponse = await axios.get(
            `${BASE_URL}/api/session/${sessionId}/report`
        );
        console.log("✅ Final report:", {
            duration: reportResponse.data.duration + " minutes",
            totalEvents: reportResponse.data.totalEvents,
            finalScore: reportResponse.data.session.integrityScore,
        });

        console.log("\n🎉 All API tests passed successfully!");
    } catch (error) {
        console.error(
            "❌ API Test failed:",
            error.response?.data || error.message
        );
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testAPI();
}

module.exports = { testAPI };
