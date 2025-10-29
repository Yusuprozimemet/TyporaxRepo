// plot.js

// Function to inject CSS styles for the plot modal
function injectPlotStyles() {
    // Only inject styles if they don't already exist
    if (!document.getElementById('plotModalStyles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'plotModalStyles';
        styleElement.innerHTML = `
            /* Modal styling */
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.6);
                backdrop-filter: blur(3px);
                transition: all 0.3s ease;
            }

            .modal-content {
                position: relative;
                background-color: #fefefe;
                margin: 2% auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                width: 90%;
                max-width: 1200px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }

            /* Close button */
            .close {
                color: #666;
                font-size: 28px;
                font-weight: bold;
                line-height: 1;
                transition: color 0.2s;
                z-index: 1001;
                position: absolute;
                left: 15px;
                top: 10px;
                cursor: pointer;
            }
            
            .close:hover {
                color: #000;
                text-decoration: none;
            }
            
            /* Full screen toggle button */
            .fullscreen-toggle {
                position: absolute;
                left: 55px;
                top: 10px;
                font-size: 24px;
                color: #666;
                cursor: pointer;
                transition: color 0.2s;
                z-index: 1001;
            }
            
            .fullscreen-toggle:hover {
                color: #000;
            }
            
            /* Export data button */
            .export-button {
                position: absolute;
                right: 1px;
                bottom: 1px;        /* Changed from top: 1px; to bottom: 1px; */
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 12px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
                z-index: 1001;
            }

            .export-button:hover {
                background-color: #2980b9;
            }
            
            /* Loading indicator */
            .plot-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 300px;
                font-size: 18px;
                color: #666;
            }
            
            /* Plot container */
            #plotContainer {
                width: 100%;
                height: 700px;
                transition: height 0.3s ease;
            }
            
            /* Full screen mode */
            .modal.fullscreen .modal-content {
                width: 100%;
                height: 100vh;
                margin: 0;
                max-width: none;
                border: none;
                border-radius: 0;
                box-shadow: none;
            }
            
            .modal.fullscreen #plotContainer {
                height: calc(100vh - 80px);
            }
            
            /* Status info */
            .status-info {
                text-align: center;
                padding: 10px;
                color: #555;
                font-size: 12px;
                position: absolute;
                bottom: 25px;
                width: 100%;
                left: 0;
            }
            
            /* Responsive adjustments */
            @media screen and (max-width: 768px) {
                .modal-content {
                    width: 95%;
                    padding: 15px;
                    margin-top: 5%;
                }
                
                #plotContainer {
                    height: 500px;
                }
                
                .modal.fullscreen #plotContainer {
                    height: calc(100vh - 100px);
                }
                
                .export-button {
                    font-size: 12px;
                    padding: 4px 10px;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// Function to open the plot modal
function openPlot() {
    // Inject CSS styles
    injectPlotStyles();

    // Create modal elements if they don't exist
    let modal = document.getElementById('plotModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'plotModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" title="Close">×</span>
                <span class="fullscreen-toggle" title="Toggle Fullscreen">⛶</span>
                <button class="export-button" title="Export Data">Export CSV</button>
                <div id="plotContainer" class="plot-loading">Loading progress data...</div>
                <div class="status-info" id="statusInfo">Last updated: ${new Date().toLocaleString()}</div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show the modal
    modal.style.display = 'block';

    // Get the modal content element for fullscreen
    const modalContent = modal.querySelector('.modal-content');

    // Get the close button and set up event handler
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function () {
        modal.style.display = 'none';
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    };

    // Set up export button
    const exportBtn = modal.querySelector('.export-button');
    exportBtn.onclick = function () {
        exportProgressData();
    };

    // Set up fullscreen toggle
    const fullscreenToggle = modal.querySelector('.fullscreen-toggle');
    fullscreenToggle.onclick = function () {
        if (!document.fullscreenElement) {
            // Enter browser fullscreen
            modalContent.requestFullscreen().then(() => {
                modal.classList.add('fullscreen');
                fullscreenToggle.textContent = '⛶';
                // Adjust layout for fullscreen
                Plotly.relayout('plotContainer', {
                    margin: { t: 150, b: 180, l: 100, r: 100 },
                    'legend.y': -0.15,
                    'updatemenus[0].y': 1.12
                });
                // Trigger resize event to ensure plot adjusts
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            }).catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            // Exit browser fullscreen
            document.exitFullscreen().then(() => {
                modal.classList.remove('fullscreen');
                fullscreenToggle.textContent = '⛶';
                // Reset layout to original
                Plotly.relayout('plotContainer', {
                    margin: { t: 120, b: 150, l: 80, r: 80 },
                    'legend.y': -0.25,
                    'updatemenus[0].y': 1.2
                });
                // Trigger resize event to ensure plot adjusts
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            }).catch(err => {
                console.error('Error exiting fullscreen:', err);
            });
        }
    };

    // Handle fullscreen change events
    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            modal.classList.remove('fullscreen');
            fullscreenToggle.textContent = '⛶';
            // Reset layout to original
            Plotly.relayout('plotContainer', {
                margin: { t: 120, b: 150, l: 80, r: 80 },
                'legend.y': -0.25,
                'updatemenus[0].y': 1.2
            });
        } else {
            modal.classList.add('fullscreen');
            fullscreenToggle.textContent = '⛶';
            // Adjust layout for fullscreen
            Plotly.relayout('plotContainer', {
                margin: { t: 150, b: 180, l: 100, r: 100 },
                'legend.y': -0.15,
                'updatemenus[0].y': 1.12
            });
        }
        // Trigger resize event to ensure plot adjusts
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    });

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    };

    // Keyboard support for closing modal with Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    });

    // Update status info
    document.getElementById('statusInfo').textContent = `Last updated: ${new Date().toLocaleString()}`;

    // Fetch progress data and render plot
    fetchProgressData();
}

// Function to fetch progress data from the Flask endpoint
function fetchProgressData() {
    const plotContainer = document.getElementById('plotContainer');
    plotContainer.innerHTML = '<div class="plot-loading">Loading progress data...</div>';

    fetch('/progress/all', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch progress data');
            }
            return response.json();
        })
        .then(data => {
            // Store data globally for export function
            window.progressData = data;
            processProgressData(data);
        })
        .catch(error => {
            console.error('Error fetching progress data:', error);
            plotContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #e74c3c; font-size: 18px;">Error loading progress data</p>
                <p style="color: #666; margin-top: 10px;">${error.message}</p>
                <button onclick="fetchProgressData()" style="
                    background-color: #3498db;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 15px;
                    font-size: 14px;
                ">Try Again</button>
            </div>
        `;
        });
}

// Function to export progress data as CSV
function exportProgressData() {
    if (!window.progressData) {
        alert("No data available to export. Please wait for data to load.");
        return;
    }

    // Prepare CSV content
    let csvContent = "Lesson,Date,Score,Performance\n";

    for (const lessonKey in window.progressData) {
        const lessonData = window.progressData[lessonKey];
        if (lessonData.tests && lessonData.tests.length > 0) {
            lessonData.tests.forEach(test => {
                if (test.score !== undefined && test.date) {
                    const date = new Date(test.date).toISOString().split('T')[0];
                    const performance = getPerformanceCategory(test.score);
                    csvContent += `"${lessonKey}","${date}",${test.score},"${performance}"\n`;
                }
            });
        }
    }

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dutch_progress_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper function to determine performance category
function getPerformanceCategory(score) {
    if (score >= 95) return "Excellent";
    if (score >= 90) return "Good";
    if (score >= 85) return "Satisfactory";
    return "Needs Improvement";
}

// Function to process progress data and create the plot
function processProgressData(progressData) {
    // Extract lesson data
    const lessons = [];
    const scores = [];
    const dates = [];
    const months = [];
    const monthNames = [];

    for (const lessonKey in progressData) {
        const lessonData = progressData[lessonKey];
        if (lessonData.tests && lessonData.tests.length > 0) {
            const latestTest = lessonData.tests[lessonData.tests.length - 1];
            if (latestTest.score !== undefined && latestTest.date) {
                lessons.push(lessonKey);
                scores.push(latestTest.score);
                const date = new Date(latestTest.date);
                dates.push(date);
                months.push(date.getMonth() + 1); // 1-based month
                monthNames.push(date.toLocaleString('default', { month: 'long' }));
            }
        }
    }

    // Sort data by date
    const indices = dates.map((_, i) => i).sort((a, b) => dates[a] - dates[b]);
    const sortedLessons = indices.map(i => lessons[i]);
    const sortedScores = indices.map(i => scores[i]);
    const sortedDates = indices.map(i => dates[i]);
    const sortedMonths = indices.map(i => months[i]);
    const sortedMonthNames = indices.map(i => monthNames[i]);

    // Calculate additional metrics
    const daysSinceStart = sortedDates.map(date =>
        (date - sortedDates[0]) / (1000 * 60 * 60 * 24)
    );
    const weeks = daysSinceStart.map(days => Math.floor(days / 7) + 1);

    // Performance categories
    const performance = sortedScores.map(score => {
        if (score >= 95) return "Excellent";
        if (score >= 90) return "Good";
        if (score >= 85) return "Satisfactory";
        return "Needs Improvement";
    });

    // Moving averages
    const movingAvg3 = calculateMovingAverage(sortedScores, 3);
    const movingAvg5 = calculateMovingAverage(sortedScores, 5);

    // Improvement
    const improvement = sortedScores.map((score, i) =>
        i === 0 ? null : score - sortedScores[i - 1]
    );

    // Color scales
    const colorScale = {
        "Excellent": "#2ecc71",
        "Good": "#3498db",
        "Satisfactory": "#f39c12",
        "Needs Improvement": "#e74c3c"
    };

    const monthColors = {
        1: "#8e44ad", // January
        2: "#2980b9", // February
        3: "#16a085", // March
        4: "#f1c40f"  // April
    };

    // Hover text
    const hoverText = sortedScores.map((score, i) => {
        const dateStr = sortedDates[i].toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });
        const imp = improvement[i] !== null ? improvement[i].toFixed(1) : "First lesson";
        return `<b>${sortedLessons[i]}</b><br>` +
            `Date: ${dateStr}<br>` +
            `Score: ${score}<br>` +
            `Performance: ${performance[i]}<br>` +
            `Week: ${weeks[i]}<br>` +
            `Improvement: ${imp}<br>` +
            `3-Lesson Avg: ${movingAvg3[i].toFixed(1)}`;
    });

    // Create Plotly traces
    const traces = [
        {
            x: sortedDates,
            y: sortedScores,
            mode: 'markers+lines',
            name: 'Lesson Scores',
            marker: {
                size: 10,
                color: performance.map(p => colorScale[p]),
                symbol: 'circle',
                line: { width: 1.5, color: 'white' }
            },
            line: { color: 'rgba(150,150,150,0.5)', width: 1.5 },
            text: hoverText,
            hoverinfo: 'text',
            customdata: sortedLessons
        },
        {
            x: sortedDates,
            y: movingAvg3,
            mode: 'lines',
            name: '3-Lesson Moving Average',
            line: { color: 'rgba(52, 152, 219, 0.7)', width: 2.5, dash: 'dot' },
            hoverinfo: 'y+name'
        },
        {
            x: sortedDates,
            y: movingAvg5,
            mode: 'lines',
            name: '5-Lesson Moving Average',
            line: { color: 'rgba(46, 204, 113, 0.7)', width: 2.5, dash: 'dash' },
            hoverinfo: 'y+name'
        },
        {
            x: sortedDates,
            y: calculateTrendLine(sortedScores, sortedDates),
            mode: 'lines',
            name: `Trend Line`,
            line: { color: 'rgba(0,0,0,0.5)', width: 2 },
            hoverinfo: 'name'
        }
    ];

    // Layout configuration
    const layout = {
        title: {
            text: "<b>Dutch Learning Progress Journey (Delftse Methode A0-A2)</b><br><sup>Track your scores, trends, and performance over time</sup>",
            y: 0.95,
            x: 0.5,
            xanchor: 'center',
            yanchor: 'top',
            font: { size: 20 }
        },
        xaxis: {
            title: 'Date',
            gridcolor: 'rgba(200,200,200,0.3)',
            type: 'date',
            rangeselector: {
                buttons: [
                    { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                    { count: 2, label: '2m', step: 'month', stepmode: 'backward' },
                    { count: 3, label: '3m', step: 'month', stepmode: 'backward' },
                    { step: 'all', label: 'All' }
                ],
                bgcolor: 'rgba(255,255,255,0.9)',
                bordercolor: 'rgba(0,0,0,0.1)',
                font: { size: 10 }
            },
            rangeslider: { visible: true }
        },
        yaxis: {
            title: 'Score (%)',
            range: [80, 103],
            tickmode: 'linear',
            tick0: 80,
            dtick: 5,
            gridcolor: 'rgba(200,200,200,0.3)'
        },
        hovermode: 'closest',
        hoverlabel: {
            bgcolor: 'white',
            font_size: 12,
            bordercolor: 'black'
        },
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: -0.25,
            xanchor: 'center',
            x: 0.5,
            bgcolor: 'rgba(255,255,255,0.9)',
            bordercolor: 'rgba(0,0,0,0.1)',
            borderwidth: 1,
            font: { size: 11 }
        },
        margin: { t: 120, b: 150, l: 80, r: 80 },
        plot_bgcolor: 'rgba(248,249,250,1)',
        paper_bgcolor: 'rgba(248,249,250,1)',
        font: { family: 'Arial, sans-serif', size: 12 },
        autosize: true, // Allow the plot to resize
        shapes: createShapes(sortedDates),
        annotations: createAnnotations(sortedDates, sortedScores, sortedMonthNames, sortedMonths, performance, colorScale, monthColors),
        updatemenus: [
            {
                type: 'buttons',
                direction: 'right',
                active: 0,
                buttons: [
                    { label: 'All Data', method: 'update', args: [{ visible: [true, true, true, true] }] },
                    { label: 'Scores Only', method: 'update', args: [{ visible: [true, false, false, false] }] },
                    { label: 'With 3-Lesson Avg', method: 'update', args: [{ visible: [true, true, false, false] }] },
                    { label: 'With 5-Lesson Avg', method: 'update', args: [{ visible: [true, false, true, false] }] },
                    { label: 'Overall Trend', method: 'update', args: [{ visible: [true, false, false, true] }] }
                ],
                pad: { r: 10, t: 10 },
                showactive: true,
                x: 0.5,
                xanchor: 'center',
                y: 1.2,
                bgcolor: 'rgba(255,255,255,0.9)',
                bordercolor: 'rgba(0,0,0,0.1)',
                font: { size: 11 }
            }
        ]
    };

    // Config options for the plot
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: [
            'toImage',
            'zoom2d',
            'pan2d',
            'select2d',
            'zoomIn2d',
            'zoomOut2d',
            'autoScale2d',
            'resetScale2d'
        ],
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: 'dutch_progress_chart',
            height: 800,
            width: 1200,
            scale: 2
        }
    };

    // Clear loading indicator
    const plotContainer = document.getElementById('plotContainer');
    plotContainer.innerHTML = '';
    plotContainer.classList.remove('plot-loading');

    // Render the plot
    Plotly.newPlot('plotContainer', traces, layout, config);

    // Update the status info
    document.getElementById('statusInfo').textContent = `Last updated: ${new Date().toLocaleString()} | Total lessons: ${sortedLessons.length}`;

    // Add resize handler to ensure plot is responsive
    window.addEventListener('resize', function () {
        if (document.getElementById('plotModal').style.display === 'block') {
            Plotly.relayout('plotContainer', {
                autosize: true
            });
        }
    });
}

// Helper function to calculate moving average
function calculateMovingAverage(data, window) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1);
        const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
        result.push(avg);
    }
    return result;
}

// Helper function to calculate trend line
function calculateTrendLine(scores, dates) {
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = scores;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return x.map(xi => intercept + slope * xi);
}

// Helper function to create shapes (background zones and month separators)
function createShapes(dates) {
    const shapes = [
        {
            type: 'rect',
            x0: new Date(dates[0].getTime() - 2 * 24 * 60 * 60 * 1000),
            x1: new Date(dates[dates.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000),
            y0: 95,
            y1: 100,
            fillcolor: 'rgba(46, 204, 113, 0.15)',
            line: { width: 0 },
            layer: 'below'
        },
        {
            type: 'rect',
            x0: new Date(dates[0].getTime() - 2 * 24 * 60 * 60 * 1000),
            x1: new Date(dates[dates.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000),
            y0: 90,
            y1: 95,
            fillcolor: 'rgba(52, 152, 219, 0.15)',
            line: { width: 0 },
            layer: 'below'
        },
        {
            type: 'rect',
            x0: new Date(dates[0].getTime() - 2 * 24 * 60 * 60 * 1000),
            x1: new Date(dates[dates.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000),
            y0: 85,
            y1: 90,
            fillcolor: 'rgba(243, 156, 18, 0.15)',
            line: { width: 0 },
            layer: 'below'
        },
        {
            type: 'rect',
            x0: new Date(dates[0].getTime() - 2 * 24 * 60 * 60 * 1000),
            x1: new Date(dates[dates.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000),
            y0: 80,
            y1: 85,
            fillcolor: 'rgba(231, 76, 60, 0.15)',
            line: { width: 0 },
            layer: 'below'
        }
    ];

    // Add month separators
    const uniqueMonths = [...new Set(dates.map(d => `${d.getFullYear()}-${d.getMonth()}`))];
    for (let i = 0; i < uniqueMonths.length - 1; i++) {
        const monthDates = dates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === uniqueMonths[i]);
        const nextMonthDates = dates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === uniqueMonths[i + 1]);
        if (monthDates.length && nextMonthDates.length) {
            const lastDay = new Date(Math.max(...monthDates));
            const firstDayNext = new Date(Math.min(...nextMonthDates));
            const boundary = new Date((lastDay.getTime() + firstDayNext.getTime()) / 2);
            shapes.push({
                type: 'line',
                x0: boundary,
                x1: boundary,
                y0: 80,
                y1: 100,
                line: { color: 'rgba(0,0,0,0.3)', width: 1, dash: 'dash' },
                layer: 'below'
            });
        }
    }

    return shapes;
}

// Helper function to create annotations
function createAnnotations(dates, scores, monthNames, months, performance, colorScale, monthColors) {
    const annotations = [];

    // Month labels
    const uniqueMonths = [...new Set(months)];
    uniqueMonths.forEach(month => {
        const monthIndices = months.map((m, i) => m === month ? i : -1).filter(i => i !== -1);
        const monthDates = monthIndices.map(i => dates[i]);
        const midDate = new Date((Math.min(...monthDates) + Math.max(...monthDates)) / 2);
        annotations.push({
            x: midDate,
            y: 101.5,
            text: monthNames[monthIndices[0]],
            showarrow: false,
            font: { size: 12, color: monthColors[month] },
            xanchor: 'center'
        });
    });

    // Highest and lowest scores
    const maxScoreIdx = scores.indexOf(Math.max(...scores));
    const minScoreIdx = scores.indexOf(Math.min(...scores));

    annotations.push({
        x: dates[maxScoreIdx],
        y: scores[maxScoreIdx],
        text: `Highest: ${scores[maxScoreIdx]}`,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 2,
        arrowcolor: '#2ecc71',
        ax: 40,
        ay: -40,
        bgcolor: '#2ecc71',
        font: { size: 10, color: 'white' },
        borderpad: 4
    });

    annotations.push({
        x: dates[minScoreIdx],
        y: scores[minScoreIdx],
        text: `Lowest: ${scores[minScoreIdx]}`,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 2,
        arrowcolor: '#e74c3c',
        ax: 40,
        ay: 40,
        bgcolor: '#e74c3c',
        font: { size: 10, color: 'white' },
        borderpad: 4
    });

    // Performance zone labels
    // Performance zone labels
    annotations.push(
        {
            x: new Date(dates[dates.length - 1].getTime() + 1 * 24 * 60 * 60 * 1000),
            y: 97.5,
            text: 'Excellent',
            showarrow: false,
            font: { size: 9, color: colorScale['Excellent'] },
            xanchor: 'left'
        },
        {
            x: new Date(dates[dates.length - 1].getTime() + 1 * 24 * 60 * 60 * 1000),
            y: 92.5,
            text: 'Good',
            showarrow: false,
            font: { size: 9, color: colorScale['Good'] },
            xanchor: 'left'
        },
        {
            x: new Date(dates[dates.length - 1].getTime() + 1 * 24 * 60 * 60 * 1000),
            y: 87.5,
            text: 'Satisfactory',
            showarrow: false,
            font: { size: 9, color: colorScale['Satisfactory'] },
            xanchor: 'left'
        },
        {
            x: new Date(dates[dates.length - 1].getTime() + 1 * 24 * 60 * 60 * 1000),
            y: 82.5,
            text: 'Needs Improvement',
            showarrow: false,
            font: { size: 9, color: colorScale['Needs Improvement'] },
            xanchor: 'left'
        }
    );

    // Stats box
    const avgScore = (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1);
    const monthlyAverages = {};
    months.forEach((m, i) => {
        if (!monthlyAverages[m]) {
            monthlyAverages[m] = { sum: 0, count: 0, scores: [] };
        }
        monthlyAverages[m].sum += scores[i];
        monthlyAverages[m].count += 1;
        monthlyAverages[m].scores.push(scores[i]);
    });
    const bestMonth = Object.keys(monthlyAverages).reduce((a, b) => 
        (monthlyAverages[a].sum / monthlyAverages[a].count) > (monthlyAverages[b].sum / monthlyAverages[b].count) ? a : b
    );
    const bestMonthAvg = (monthlyAverages[bestMonth].sum / monthlyAverages[bestMonth].count).toFixed(1);
    const monthStd = Object.keys(monthlyAverages).map(m => {
        const scores = monthlyAverages[m].scores;
        const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        return Math.sqrt(variance);
    });
    const mostConsistentMonthIdx = monthStd.indexOf(Math.min(...monthStd));
    const mostConsistentMonth = Object.keys(monthlyAverages)[mostConsistentMonthIdx];
    const mostConsistentStd = monthStd[mostConsistentMonthIdx].toFixed(1);

    const statsText = `<b>Learning Progress Statistics</b><br>` +
                     `Total Lessons: ${scores.length}<br>` +
                     `Average Score: ${avgScore}<br>` +
                     `Best Month: ${monthNames[months.indexOf(parseInt(bestMonth))]} (${bestMonthAvg})<br>` +
                     `Most Consistent Month: ${monthNames[months.indexOf(parseInt(mostConsistentMonth))]} (σ=${mostConsistentStd})`;

    annotations.push({
        x: 0.8, // Left edge of the plot paper
        y: 0.9, // Below the plot area
        xref: 'paper', // Use paper coordinates
        yref: 'paper', // Use paper coordinates
        text: statsText,
        showarrow: false,
        font: { size: 13, color: 'black' },
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: 'rgba(0, 0, 0, 0.3)',
        borderwidth: 1,
        borderpad: 6,
        align: 'left',
        xanchor: 'left',
        yanchor: 'bottom'
    });

    return annotations;
}