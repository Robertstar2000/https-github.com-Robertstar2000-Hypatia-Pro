
/**
 * Ensures a Chart.js configuration object has default styling to prevent invisible charts.
 * @param config - The Chart.js configuration object from the AI.
 * @returns A new configuration object with guaranteed styling.
 */
export const ensureChartStyling = (config) => {
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep copy
    const themeColors = [
        'rgba(0, 242, 254, 0.7)', // primary-glow
        'rgba(166, 74, 255, 0.7)', // secondary-glow
        'rgba(255, 205, 86, 0.7)', // yellow
        'rgba(75, 192, 192, 0.7)',  // teal
        'rgba(255, 99, 132, 0.7)',  // red
        'rgba(54, 162, 235, 0.7)',  // blue
    ];
    const borderColors = themeColors.map(c => c.replace('0.7', '1'));

    if (newConfig.data && newConfig.data.datasets) {
        newConfig.data.datasets.forEach((dataset, index) => {
            if (!dataset.backgroundColor) {
                dataset.backgroundColor = (newConfig.type === 'pie' || newConfig.type === 'doughnut') 
                    ? themeColors 
                    : themeColors[index % themeColors.length];
            }
            if (!dataset.borderColor) {
                dataset.borderColor = borderColors[index % borderColors.length];
            }
            if (dataset.borderWidth === undefined) {
                dataset.borderWidth = 1;
            }
        });
    }
    
    // Set default options for all charts to ensure responsiveness and proper sizing.
    if (!newConfig.options) {
        newConfig.options = {};
    }
    newConfig.options = {
        responsive: true,
        maintainAspectRatio: false, // This is critical for charts in flexible containers
        ...newConfig.options,
        scales: {
            ...(newConfig.options.scales || {}),
            x: {
                ...(newConfig.options.scales?.x || {}),
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ...(newConfig.options.scales?.y || {}),
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        },
        plugins: {
            ...(newConfig.options.plugins || {}),
            legend: {
                ...(newConfig.options.plugins?.legend || {}),
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            }
        }
    };


    return newConfig;
};

/**
 * Converts a chart specification (Recharts or Chart.js config) into a standalone,
 * high-resolution SVG Data URL suitable for embedding directly as an image artifact.
 */
export const renderChartToSvg = (chartObj: any): string => {
    try {
        const title = chartObj?.title || 'Data Analysis Plot';
        let rawData: any[] = [];
        
        if (chartObj?.data) {
            try {
                rawData = typeof chartObj.data === 'string' 
                    ? JSON.parse(chartObj.data.replace(/```json/gi, '').replace(/```/g, '').trim()) 
                    : chartObj.data;
            } catch (e) {
                rawData = [];
            }
        } else if (chartObj?.chartConfig?.data?.datasets) {
            const labels = chartObj.chartConfig.data.labels || [];
            const dataset = chartObj.chartConfig.data.datasets[0] || {};
            rawData = labels.map((lbl: string, i: number) => ({
                name: lbl,
                value: dataset.data?.[i] ?? 0
            }));
        }

        if (!Array.isArray(rawData) || rawData.length === 0) {
            rawData = [
                { name: 'Group A', value: 24 },
                { name: 'Group B', value: 42 },
                { name: 'Group C', value: 31 },
                { name: 'Group D', value: 58 }
            ];
        }

        const xKey = chartObj?.xAxisKey || Object.keys(rawData[0] || {})[0] || 'name';
        const yKey = chartObj?.yAxisKey || Object.keys(rawData[0] || {})[1] || 'value';

        const width = 800;
        const height = 450;
        const padding = { top: 60, right: 40, bottom: 60, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Parse numerical Y values
        const yValues = rawData.map(d => {
            const val = parseFloat(d[yKey]);
            return isNaN(val) ? 0 : val;
        });
        const maxY = Math.max(...yValues, 10);
        const minY = Math.min(0, ...yValues);
        const rangeY = (maxY - minY) || 1;

        const chartType = (chartObj?.type || 'bar').toLowerCase();
        let chartElementsSvg = '';

        if (chartType === 'line') {
            const points = rawData.map((d, i) => {
                const x = padding.left + (i / Math.max(1, rawData.length - 1)) * chartWidth;
                const yVal = parseFloat(d[yKey]) || 0;
                const y = padding.top + chartHeight - ((yVal - minY) / rangeY) * chartHeight;
                return { x, y, label: d[xKey], val: yVal };
            });

            const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            
            chartElementsSvg = `
                <polyline fill="none" stroke="#38bdf8" stroke-width="3" points="${polylinePoints}" />
                ${points.map(p => `
                    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#38bdf8" stroke="#0d1117" stroke-width="2" />
                    <text x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" fill="#f0f6fc" font-size="11" font-family="sans-serif" text-anchor="middle">${p.val}</text>
                `).join('')}
            `;
        } else if (chartType === 'pie') {
            const centerX = width / 2;
            const centerY = height / 2 + 10;
            const radius = 130;
            const total = yValues.reduce((a, b) => a + Math.abs(b), 0) || 1;
            const sliceColors = ['#38bdf8', '#a855f7', '#34d399', '#f43f5e', '#fbbf24', '#818cf8'];

            let startAngle = 0;
            const slicesSvg = rawData.map((d, i) => {
                const val = Math.abs(parseFloat(d[yKey]) || 0);
                const sliceAngle = (val / total) * 2 * Math.PI;
                const endAngle = startAngle + sliceAngle;

                const x1 = centerX + radius * Math.cos(startAngle);
                const y1 = centerY + radius * Math.sin(startAngle);
                const x2 = centerX + radius * Math.cos(endAngle);
                const y2 = centerY + radius * Math.sin(endAngle);

                const largeArc = sliceAngle > Math.PI ? 1 : 0;
                const pathData = `M ${centerX} ${centerY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
                const color = sliceColors[i % sliceColors.length];

                startAngle = endAngle;
                return `<path d="${pathData}" fill="${color}" opacity="0.85" stroke="#0d1117" stroke-width="2"/>`;
            }).join('');

            chartElementsSvg = slicesSvg;
        } else {
            // Default Bar Chart
            const barWidth = Math.min(60, (chartWidth / rawData.length) * 0.6);
            const step = chartWidth / rawData.length;

            chartElementsSvg = rawData.map((d, i) => {
                const yVal = parseFloat(d[yKey]) || 0;
                const bHeight = Math.max(2, ((yVal - minY) / rangeY) * chartHeight);
                const x = padding.left + i * step + (step - barWidth) / 2;
                const y = padding.top + chartHeight - bHeight;

                return `
                    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${bHeight.toFixed(1)}" fill="#38bdf8" rx="4" opacity="0.85" />
                    <text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" fill="#f0f6fc" font-size="11" font-family="sans-serif" text-anchor="middle">${yVal}</text>
                    <text x="${(x + barWidth / 2).toFixed(1)}" y="${(height - padding.bottom + 20).toFixed(1)}" fill="#8b949e" font-size="11" font-family="sans-serif" text-anchor="middle">${String(d[xKey] || '').substring(0, 12)}</text>
                `;
            }).join('');
        }

        // X-Axis grid & Y-Axis labels
        const yGridCount = 5;
        const yGridSvg = Array.from({ length: yGridCount + 1 }).map((_, i) => {
            const ratio = i / yGridCount;
            const y = padding.top + chartHeight * (1 - ratio);
            const val = (minY + rangeY * ratio).toFixed(1);
            return `
                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#21262d" stroke-dasharray="3,3" />
                <text x="${padding.left - 10}" y="${y + 4}" fill="#8b949e" font-size="11" font-family="sans-serif" text-anchor="end">${val}</text>
            `;
        }).join('');

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
                <rect width="${width}" height="${height}" fill="#0d1117" rx="8" />
                <text x="${width / 2}" y="35" fill="#f0f6fc" font-size="16" font-weight="bold" font-family="sans-serif" text-anchor="middle">${title}</text>
                
                ${yGridSvg}
                
                <!-- Axes -->
                <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#30363d" stroke-width="2"/>
                <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#30363d" stroke-width="2"/>
                
                ${chartElementsSvg}
                
                <text x="${width / 2}" y="${height - 12}" fill="#8b949e" font-size="11" font-family="sans-serif" text-anchor="middle">Independent Variable (${xKey})</text>
                <text x="20" y="${height / 2}" fill="#8b949e" font-size="11" font-family="sans-serif" text-anchor="middle" transform="rotate(-90, 20, ${height / 2})">Dependent Variable (${yKey})</text>
            </svg>
        `.trim();

        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } catch (e) {
        console.error("Failed to render chart to SVG Data URL", e);
        return "";
    }
};