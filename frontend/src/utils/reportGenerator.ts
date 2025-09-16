import jsPDF from "jspdf";

interface SessionReport {
    session: {
        _id: string;
        candidateName: string;
        interviewerId: string;
        startTime: string;
        endTime: string;
        isActive: boolean;
        integrityScore: number;
        events: Array<{
            type: string;
            description: string;
            timestamp: string;
            severity: string;
            deduction: number;
        }>;
    };
    duration: number;
    eventStats: { [key: string]: number };
    totalEvents: number;
}

export const generatePDFReport = (reportData: SessionReport): void => {
    console.log(reportData);
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 30;

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("🎯 Interview Proctoring Report", margin, yPosition);
    yPosition += 20;

    // Draw line
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Session Information
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Session Information", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    const sessionInfo = [
        `Candidate Name: ${reportData.session.candidateName}`,
        `Interviewer ID: ${reportData.session.interviewerId}`,
        `Start Time: ${new Date(
            reportData.session.startTime
        ).toLocaleString()}`,
        `End Time: ${
            reportData.session.endTime
                ? new Date(reportData.session.endTime).toLocaleString()
                : "Ongoing"
        }`,
        `Duration: ${reportData.duration} minutes`,
        `Session ID: ${reportData.session._id}`,
    ];

    sessionInfo.forEach((info) => {
        pdf.text(info, margin, yPosition);
        yPosition += 8;
    });

    yPosition += 10;

    // Integrity Score (highlighted)
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    const scoreColor =
        reportData.session.integrityScore >= 80
            ? [34, 197, 94]
            : reportData.session.integrityScore >= 60
            ? [245, 158, 11]
            : [239, 68, 68];
    pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    pdf.text(
        `Final Integrity Score: ${reportData.session.integrityScore}/100`,
        margin,
        yPosition
    );
    yPosition += 15;

    // Reset color
    pdf.setTextColor(0, 0, 0);

    // Event Statistics
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Violation Statistics", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Total Events: ${reportData.totalEvents}`, margin, yPosition);
    yPosition += 8;

    if (
        reportData.eventStats &&
        Object.keys(reportData.eventStats).length > 0
    ) {
        Object.entries(reportData.eventStats).forEach(([type, count]) => {
            const eventText = `${type
                .replace(/_/g, " ")
                .toUpperCase()}: ${count}`;
            pdf.text(eventText, margin + 10, yPosition);
            yPosition += 7;
        });
    }
    // else {
    //     pdf.text("No violations detected", margin + 10, yPosition);
    //     yPosition += 7;
    // }

    yPosition += 10;

    // Detailed Events
    if (reportData.session.events && reportData.session.events.length > 0) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Detailed Event Log", margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        // Table headers
        const headers = ["Time", "Type", "Description", "Severity"];
        const colWidths = [35, 35, 80, 25];
        let xPosition = margin;

        pdf.setFont("helvetica", "bold");
        headers.forEach((header, index) => {
            pdf.text(header, xPosition, yPosition);
            xPosition += colWidths[index];
        });
        yPosition += 8;

        // Draw line under headers
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        pdf.setFont("helvetica", "normal");

        reportData.session.events.slice(-20).forEach((event) => {
            // Check if we need a new page
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = 30;
            }

            const time = new Date(event.timestamp).toLocaleTimeString();
            const type = event.type.replace(/_/g, " ");
            const description =
                event.description.length > 35
                    ? event.description.substring(0, 32) + "..."
                    : event.description;
            const severity = event.severity.toUpperCase();

            xPosition = margin;
            pdf.text(time, xPosition, yPosition);
            xPosition += colWidths[0];
            pdf.text(type, xPosition, yPosition);
            xPosition += colWidths[1];
            pdf.text(description, xPosition, yPosition);
            xPosition += colWidths[2];

            // Color code severity
            const severityColor =
                event.severity === "high"
                    ? [239, 68, 68]
                    : event.severity === "medium"
                    ? [245, 158, 11]
                    : [34, 197, 94];
            pdf.setTextColor(
                severityColor[0],
                severityColor[1],
                severityColor[2]
            );
            pdf.text(severity, xPosition, yPosition);
            pdf.setTextColor(0, 0, 0);

            yPosition += 7;
        });
    }

    // Add footer
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, 280);
    pdf.text("Tutedude Proctoring System", pageWidth - margin - 50, 280);

    // Save the PDF
    const filename = `interview-report-${reportData.session.candidateName.replace(
        /\s+/g,
        "-"
    )}-${Date.now()}.pdf`;
    pdf.save(filename);
};

export const generateCSVReport = (reportData: SessionReport): void => {
    const csvData = [
        ["Tutedude Interview Proctoring Report"],
        [""],
        ["Session Information"],
        ["Field", "Value"],
        ["Candidate Name", reportData.session.candidateName],
        ["Interviewer ID", reportData.session.interviewerId],
        ["Start Time", reportData.session.startTime],
        ["End Time", reportData.session.endTime || "Ongoing"],
        ["Duration (minutes)", reportData.duration.toString()],
        ["Final Integrity Score", `${reportData.session.integrityScore}/100`],
        ["Total Events", reportData.totalEvents.toString()],
        [""],
        ["Event Statistics"],
        ["Event Type", "Count"],
        ...Object.entries(reportData.eventStats || {}).map(([type, count]) => [
            type.replace(/_/g, " ").toUpperCase(),
            count.toString(),
        ]),
        [""],
        ["Detailed Event Log"],
        ["Timestamp", "Type", "Description", "Severity"],
        ...reportData.session.events.map((event) => [
            event.timestamp,
            event.type.replace(/_/g, " ").toUpperCase(),
            event.description,
            event.severity.toUpperCase(),
        ]),
    ];

    const csvContent = csvData
        .map((row) =>
            row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${reportData.session.candidateName.replace(
        /\s+/g,
        "-"
    )}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};
