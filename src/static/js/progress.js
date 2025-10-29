// Test and progress
document.addEventListener("DOMContentLoaded", () => {
    let currentLesson = null; // Store the currently selected filename
    let currentFolder = null; // Store the currently selected folder

    // Listen for the custom event 'fileSelected' from FileOperation.js
    document.addEventListener('fileSelected', (event) => {
        currentLesson = event.detail.filename;
        currentFolder = event.detail.folder || ''; // Use empty string as fallback instead of 'free'
        console.log('Lesson selected in progress.js:', currentLesson, 'Folder:', currentFolder);
        loadProgress();
    });

    // Open the progress modal
    window.openProgressModal = function () {
        const modal = document.querySelector(".progress-modal");
        modal.style.display = "block";
        if (currentLesson) {
            loadProgress();
        } else {
            console.log("No lesson selected. Please select a file.");
            document.getElementById("progress-container").innerHTML = "<p>No lesson selected. Please select a file.</p>";
        }
    };

    // Close the progress modal
    window.closeProgressModal = function () {
        const modal = document.querySelector(".progress-modal");
        modal.style.display = "none";
    };

    // Load progress data from the server for the current lesson
    async function loadProgress() {
        if (!currentLesson) {
            console.log("No lesson selected. Cannot load progress.");
            document.getElementById("progress-container").innerHTML = "<p>No lesson selected. Please select a file.</p>";
            return;
        }
        try {
            const url = currentFolder
                ? `/progress/${encodeURIComponent(currentFolder)}/${encodeURIComponent(currentLesson)}`
                : `/progress/${encodeURIComponent(currentLesson)}`;
            console.log('Fetching progress from:', url); // Debug
            const response = await fetch(url);
            if (response.ok) {
                const progressData = await response.json();
                renderProgress(progressData);
            } else {
                console.error("Failed to load progress data:", response.status);
                document.getElementById("progress-container").innerHTML = "<p>Failed to load progress.</p>";
            }
        } catch (error) {
            console.error("Error loading progress:", error);
            document.getElementById("progress-container").innerHTML = "<p>Error loading progress.</p>";
        }
    }

    // Render the test progress in the modal
    function renderProgress(progressData) {
        const progressContainer = document.getElementById("progress-container");
        progressContainer.innerHTML = "";

        // Create a container for buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "progress-buttons";

        // Take Test button
        const takeTestButton = document.createElement("button");
        takeTestButton.textContent = "Take Test";
        takeTestButton.className = "take-test-button";
        takeTestButton.addEventListener("click", generateTest);
        buttonContainer.appendChild(takeTestButton);

        // Export CSV button
        const exportCsvButton = document.createElement("button");
        exportCsvButton.textContent = "Export details as CSV";
        exportCsvButton.className = "export-csv-button";
        exportCsvButton.addEventListener("click", () => exportToCsv(progressData.tests || []));
        buttonContainer.appendChild(exportCsvButton);

        progressContainer.appendChild(buttonContainer);

        const testAttempts = progressData.tests || [];
        if (testAttempts.length === 0) {
            const noTests = document.createElement("p");
            noTests.textContent = "No test attempts yet.";
            progressContainer.appendChild(noTests);
            return;
        }

        const testList = document.createElement("div");
        testList.className = "test-attempts";
        testAttempts.forEach((attempt, index) => {
            const testItem = document.createElement("div");
            testItem.className = "test-attempt";

            // Display the overall score with percentage
            testItem.innerHTML = `
                <h3>Test ${index + 1}: Score: ${attempt.score}%</h3>
                <p>Date: ${new Date(attempt.date).toLocaleDateString()}</p>
                <button class="toggle-details">Show Details</button>
                <div class="test-details" style="display: none;">
                    <p>Score Explanation: You scored ${attempt.score}% because you earned ${Math.round((attempt.score / 100) * attempt.total_points)} out of ${attempt.total_points} possible points.</p>
                    <div class="table-wrapper">
                        <table class="test-results-table">
                            <thead>
                                <tr>
                                    <th>Question (English)</th>
                                    <th>Your Answer (Dutch)</th>
                                    <th>Correct Answer (Dutch)</th>
                                    <th>Points</th>
                                    <th>Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attempt.questions.map((q) => `
                                    <tr class="${q.points === q.max_points ? 'correct' : q.points > 0 ? 'partially-correct' : 'incorrect'}">
                                        <td>${q.english}</td>
                                        <td>${q.user_answer || '(no answer)'}</td>
                                        <td>${q.dutch}</td>
                                        <td>${q.points}/${q.max_points}</td>
                                        <td>${q.feedback || (q.points === q.max_points ? 'Perfect!' : q.points > 0 ? 'Partially correct' : 'Incorrect')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            testList.appendChild(testItem);
        });
        progressContainer.appendChild(testList);

        // Add event listeners for toggle-details buttons
        document.querySelectorAll('.toggle-details').forEach(button => {
            button.addEventListener('click', () => {
                const details = button.nextElementSibling;
                const isHidden = details.style.display === 'none';
                details.style.display = isHidden ? 'block' : 'none';
                button.textContent = isHidden ? 'Hide Details' : 'Show Details';
            });
        });
    }

    // Helper function to export test data to CSV
    function exportToCsv(testAttempts) {
        if (testAttempts.length === 0) {
            alert("No test attempts to export.");
            return;
        }

        // Define CSV headers
        const headers = [
            "Test Number",
            "Score (%)",
            "Date",
            "Question (English)",
            "Your Answer (Dutch)",
            "Correct Answer (Dutch)",
            "Points",
            "Max Points",
            "Feedback"
        ];

        // Prepare CSV rows
        const rows = [];
        testAttempts.forEach((attempt, index) => {
            const testNumber = index + 1;
            const score = attempt.score;
            const date = new Date(attempt.date).toLocaleDateString();

            attempt.questions.forEach((q, qIndex) => {
                // Escape quotes and handle commas in fields
                const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;

                const row = [
                    qIndex === 0 ? testNumber : "", // Only include test number for first question
                    qIndex === 0 ? score : "",      // Only include score for first question
                    qIndex === 0 ? date : "",       // Only include date for first question
                    escapeCsv(q.english),
                    escapeCsv(q.user_answer || '(no answer)'),
                    escapeCsv(q.dutch),
                    q.points || 0,
                    q.max_points,
                    escapeCsv(q.feedback || (q.points === q.max_points ? 'Perfect!' : q.points > 0 ? 'Partially correct' : 'Incorrect'))
                ];
                rows.push(row.join(","));
            });
        });

        // Combine headers and rows
        const csvContent = [headers.join(","), ...rows].join("\n");

        // Create a downloadable CSV file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `test_progress_${currentLesson || "lesson"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Generate a test for the current lesson
    async function generateTest() {
        if (!currentLesson) {
            console.log("No lesson selected. Cannot generate test.");
            alert("Please select a lesson first.");
            return;
        }
        try {
            const url = currentFolder
                ? `/progress/generate_test/${encodeURIComponent(currentFolder)}/${encodeURIComponent(currentLesson)}`
                : `/progress/generate_test/${encodeURIComponent(currentLesson)}`;
            console.log('Generating test from:', url); // Debug
            const response = await fetch(url, {
                method: "GET",
            });
            if (response.ok) {
                const testData = await response.json();
                if (testData.questions.length === 0) {
                    alert("No sentences available for testing.");
                    return;
                }
                displayTest(testData);
            } else {
                const errorData = await response.json();
                console.error("Failed to generate test:", errorData.error || "Unknown error");
                alert(`Failed to generate test: ${errorData.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error generating test:", error);
            alert("Error generating test.");
        }
    }


    // Display the test
    function displayTest(testData) {
        const modal = document.createElement("div");
        modal.className = "test-modal";
        modal.style.display = "block";

        const testContainer = document.createElement("div");
        testContainer.className = "test-container";

        const title = document.createElement("h2");
        title.textContent = `Test for ${currentLesson}`;
        testContainer.appendChild(title);

        const questionContainer = document.createElement("div");
        questionContainer.className = "question-container";

        let currentQuestionIndex = 0;
        const userAnswers = new Array(testData.questions.length).fill("");

        function renderQuestion(index) {
            questionContainer.innerHTML = "";
            const q = testData.questions[index];

            const questionDiv = document.createElement("div");
            questionDiv.className = "question";
            questionDiv.innerHTML = `<p>${index + 1}/${testData.questions.length}. English: ${q.english}</p>`;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "answer-input";
            input.value = userAnswers[index] || "";
            input.placeholder = "Type the Dutch sentence";
            input.addEventListener("input", () => {
                userAnswers[index] = input.value.trim();
            });

            questionDiv.appendChild(input);
            questionContainer.appendChild(questionDiv);

            const navDiv = document.createElement("div");
            navDiv.className = "nav-buttons";

            const prevButton = document.createElement("button");
            prevButton.textContent = "Previous";
            prevButton.disabled = index === 0;
            prevButton.addEventListener("click", () => {
                if (index > 0) {
                    currentQuestionIndex--;
                    renderQuestion(currentQuestionIndex);
                }
            });

            const nextButton = document.createElement("button");
            nextButton.textContent = index === testData.questions.length - 1 ? "Submit" : "Next";
            nextButton.addEventListener("click", () => {
                if (index < testData.questions.length - 1) {
                    currentQuestionIndex++;
                    renderQuestion(currentQuestionIndex);
                } else {
                    submitTest();
                }
            });

            navDiv.appendChild(prevButton);
            navDiv.appendChild(nextButton);
            questionContainer.appendChild(navDiv);
        }

        async function submitTest() {
            // Create test result with initial data
            const totalQuestions = testData.questions.length;
            const testResult = {
                score: 0,
                date: new Date().toISOString(),
                total_points: totalQuestions * 10, // Maximum 10 points per question
                questions: testData.questions.map((q, index) => {
                    const userAnswer = userAnswers[index] || "";
                    return {
                        english: q.english,
                        dutch: q.dutch,
                        user_answer: userAnswer,
                        max_points: 10
                    };
                })
            };

            // Submit test to the server for evaluation
            const scoreUrl = currentFolder
                ? `/progress/evaluate_test/${encodeURIComponent(currentFolder)}/${encodeURIComponent(currentLesson)}`
                : `/progress/evaluate_test/${encodeURIComponent(currentLesson)}`;

            try {
                const scoreResponse = await fetch(scoreUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ test: testResult }),
                });

                if (scoreResponse.ok) {
                    const evaluatedTest = await scoreResponse.json();
                    testResult.score = evaluatedTest.score;
                    testResult.questions = evaluatedTest.questions;
                    await saveTestResult(testResult);
                    displayResults(testResult);
                } else {
                    console.error("Failed to evaluate test");
                    // Fallback to client-side exact match evaluation
                    evaluateLocally(testResult);
                    await saveTestResult(testResult);
                    displayResults(testResult);
                }
            } catch (error) {
                console.error("Error evaluating test:", error);
                // Fallback to client-side exact match evaluation
                evaluateLocally(testResult);
                await saveTestResult(testResult);
                displayResults(testResult);
            }
        }

        // Fallback local evaluation method
        function evaluateLocally(testResult) {
            let totalPoints = 0;

            testResult.questions.forEach((q) => {
                if (q.user_answer.toLowerCase() === q.dutch.toLowerCase()) {
                    q.points = 10;
                    q.feedback = "Perfect!";
                } else {
                    q.points = 0;
                    q.feedback = "Incorrect";
                }
                totalPoints += q.points;
            });

            testResult.score = Math.round((totalPoints / testResult.total_points) * 100);
        }

        // Display test results
        function displayResults(testResult) {
            const resultModal = document.createElement("div");
            resultModal.className = "result-modal";
            resultModal.style.display = "block";

            const resultContainer = document.createElement("div");
            resultContainer.className = "result-container";

            const resultTitle = document.createElement("h2");
            resultTitle.textContent = `Test Results`;
            resultContainer.appendChild(resultTitle);

            const summary = document.createElement("p");
            const earnedPoints = testResult.questions.reduce((sum, q) => sum + (q.points || 0), 0);
            summary.innerHTML = `You scored <strong>${testResult.score}%</strong> (${earnedPoints} out of ${testResult.total_points} points).`;
            resultContainer.appendChild(summary);

            const tableWrapper = document.createElement("div");
            tableWrapper.className = "table-wrapper";

            const resultTable = document.createElement("table");
            resultTable.className = "test-results-table";
            resultTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Question (English)</th>
                        <th>Your Answer (Dutch)</th>
                        <th>Correct Answer (Dutch)</th>
                        <th>Points</th>
                        <th>Feedback</th>
                    </tr>
                </thead>
                <tbody>
                    ${testResult.questions.map((q) => {
                const rowClass = q.points === q.max_points ? 'correct' :
                    q.points > 0 ? 'partially-correct' : 'incorrect';
                return `
                            <tr class="${rowClass}">
                                <td>${q.english}</td>
                                <td>${q.user_answer || '(no answer)'}</td>
                                <td>${q.dutch}</td>
                                <td>${q.points || 0}/${q.max_points}</td>
                                <td>${q.feedback || (q.points === q.max_points ? 'Perfect!' :
                        q.points > 0 ? 'Partially correct' : 'Incorrect')}</td>
                            </tr>
                        `;
            }).join('')}
                </tbody>
            `;
            tableWrapper.appendChild(resultTable);
            resultContainer.appendChild(tableWrapper);

            const closeButton = document.createElement("button");
            closeButton.textContent = "Close";
            closeButton.className = "close-result-button";
            closeButton.addEventListener("click", () => {
                resultModal.style.display = "none";
                resultModal.remove();
                modal.style.display = "none";
                modal.remove();
                loadProgress();
            });

            resultContainer.appendChild(closeButton);
            resultModal.appendChild(resultContainer);
            document.body.appendChild(resultModal);

            resultModal.addEventListener("click", (e) => {
                if (e.target === resultModal) {
                    resultModal.style.display = "none";
                    resultModal.remove();
                    modal.style.display = "none";
                    modal.remove();
                    loadProgress();
                }
            });
        }

        // Save test result
        async function saveTestResult(testResult) {
            if (!currentLesson) {
                console.log("No lesson selected. Cannot save test result.");
                return;
            }
            try {
                const url = currentFolder
                    ? `/progress/${encodeURIComponent(currentFolder)}/${encodeURIComponent(currentLesson)}`
                    : `/progress/${encodeURIComponent(currentLesson)}`;
                console.log('Saving test result to:', url); // Debug
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ test: testResult }),
                });
                if (response.ok) {
                    console.log(`Test result saved for ${currentLesson}`);
                } else {
                    console.error(`Failed to save test result for ${currentLesson}`);
                }
            } catch (error) {
                console.error(`Error saving test result for ${currentLesson}:`, error);
            }
        }

        renderQuestion(currentQuestionIndex);

        testContainer.appendChild(questionContainer);
        modal.appendChild(testContainer);
        document.body.appendChild(modal);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
                modal.remove();
            }
        });

        // Focus on input field when modal is shown
        setTimeout(() => {
            const input = document.querySelector('.answer-input');
            if (input) input.focus();
        }, 100);
    }
});