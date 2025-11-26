// --- CHART MANAGEMENT ---

const MAX_DATA_POINTS = 20;

/**
 * Creates and returns a Chart.js instance for a single dataset.
 * @param {string} elementId - ID of the canvas element.
 * @param {string} label - The label for the dataset (e.g., "Temperature").
 * @param {string} unit - The unit for the axis label (e.g., "°C").
 * @param {string} borderColor - The color of the line.
 * @param {string} tickColor - The color for the Y axis ticks.
 */
export function createSingleChart(elementId, label, unit, borderColor, tickColor) {
    const ctx = document.getElementById(elementId).getContext('2d');
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: `${label} (${unit})`,
                    data: [],
                    backgroundColor: `${borderColor.replace(')', ', 0.5)')}`,
                    borderColor: borderColor,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#b0b3b8' } 
                }
            },
            scales: {
                x: { 
                    ticks: { 
                        color: '#b0b3b8', 
                        maxTicksLimit: 10,
                        autoSkip: true
                    }, 
                    grid: { color: '#333' } 
                },
                y: { 
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { color: tickColor },
                    grid: { color: '#333' },
                    title: {
                        display: true,
                        text: unit,
                        color: tickColor
                    }
                }
            }
        }
    });
}


/**
 * Updates a single chart dynamically with a new data point.
 * @param {object} chart - The Chart.js instance to update.
 * @param {number} value - The new numeric data value.
 */

export function updateSingleChart(chart, value) {
    const updatedPoint = isNaN(value) ? null : value;
    if (chart) {
        const now = new Date();
        const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Remove oldest point if chart exceeds MAX_DATA_POINTS
        if (chart.data.labels.length >= MAX_DATA_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift(); 
        }
        
        // Add new data point
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(value); 
        console.log ("Update chart with the value ", updatedPoint);
        chart.update(updatedPoint);
    }
}
if (typeof module === 'object') {
    module.exports = {createSingleChart,updateSingleChart};
}

