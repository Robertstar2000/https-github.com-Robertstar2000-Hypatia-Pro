import React, { useEffect, useRef, useState, useMemo } from 'react';
import { renderMarkdown } from '../../utils/markdownRenderer';
import Chart from 'chart.js/auto';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

export const DataAnalysisView = ({ analysisData, onError }: { analysisData: any, onError?: (error: string) => void }) => {
    const chartRefs = useRef<Array<HTMLCanvasElement | null>>([]);

    useEffect(() => {
        const charts: any[] = [];
        
        if (analysisData?.charts && Array.isArray(analysisData.charts)) {
            analysisData.charts.forEach((chartData: any, index: number) => {
                if (chartData.chartConfig) {
                    const canvas = chartRefs.current[index];
                    if (canvas) {
                        try {
                            let configStr = chartData.chartConfig;
                            if (typeof configStr === 'string') {
                                configStr = configStr.replace(/```json/gi, '').replace(/```/g, '').trim();
                            }
                            const config = typeof configStr === 'string' 
                                 ? JSON.parse(configStr) 
                                 : chartData.chartConfig;
                            
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                const newChart = new Chart(ctx, config);
                                charts.push(newChart);
                            }
                        } catch (e) {
                            console.error("Failed to render chart:", chartData.title, e);
                        }
                    }
                }
            });
        }
        return () => {
            charts.forEach(chart => chart.destroy());
        };
    }, [analysisData]);

    const renderRecharts = (chart: any) => {
        let data: any[] = [];
        try {
            if (typeof chart.data === 'string') {
                const clean = chart.data.replace(/```json/gi, '').replace(/```/g, '').trim();
                data = JSON.parse(clean);
            } else if (Array.isArray(chart.data)) {
                data = chart.data;
            } else if (chart.data && typeof chart.data === 'object') {
                data = Object.values(chart.data);
            }
        } catch (e) {
            return <div className="text-danger small p-2">Failed to parse chart data.</div>;
        }

        if (!Array.isArray(data) || data.length === 0) {
            return <div className="text-white-50 small p-3 text-center">No plottable data series available.</div>;
        }

        const firstItem = (typeof data[0] === 'object' && data[0] !== null) ? data[0] : {};
        const keys = Object.keys(firstItem);
        const xKey = chart.xAxisKey || keys[0] || 'name';
        const yKey = chart.yAxisKey || keys[1] || keys[0] || 'value';

        switch (chart.type) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey={xKey} stroke="#888" />
                            <YAxis stroke="#888" />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            <Legend />
                            <Line type="monotone" dataKey={yKey} stroke="#0d6efd" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'scatter':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey={xKey} name={xKey} stroke="#888" />
                            <YAxis dataKey={yKey} name={yKey} stroke="#888" />
                            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            <Scatter name={chart.title} data={data} fill="#0dcaf0" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} fill="#198754" label />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'bar':
            default:
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey={xKey} stroke="#888" />
                            <YAxis stroke="#888" />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            <Legend />
                            <Bar dataKey={yKey} fill="#6f42c1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    if (!analysisData || analysisData.summary === undefined) {
        return <div className="alert alert-info">Awaiting analysis results...</div>;
    }

    const hasCharts = Array.isArray(analysisData.charts) && analysisData.charts.length > 0;
    const hasTables = Array.isArray(analysisData.tables) && analysisData.tables.length > 0;

    return (
        <div>
            {analysisData.summary && (
                <div className="generated-text-container" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisData.summary) }} />
            )}
            
            {hasTables && (
                <div className="mt-4">
                    <h5 className="fw-bold mb-3"><i className="bi bi-table me-2 text-primary-glow"></i>Statistical Data Tables</h5>
                    <div className="row g-4">
                        {analysisData.tables.map((table: any, index: number) => (
                            <div className="col-12" key={index}>
                                <div className="card bg-black border-secondary border-opacity-10 shadow-sm overflow-hidden">
                                    <div className="card-header border-secondary border-opacity-10 bg-dark bg-opacity-25 fw-bold small text-uppercase ls-1">
                                        {table.title || `Data Node ${index + 1}`}
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            <table className="table table-dark table-hover mb-0 small">
                                                <thead>
                                                    <tr>
                                                        {table.headers.map((h: string, i: number) => <th key={i} className="border-secondary border-opacity-10">{h}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {table.rows.map((row: string[], i: number) => (
                                                        <tr key={i}>
                                                            {row.map((cell: string, j: number) => <td key={j} className="border-secondary border-opacity-10">{cell}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {hasCharts && (
                <div className="mt-4">
                    <h5 className="fw-bold mb-3"><i className="bi bi-bar-chart-fill me-2 text-primary-glow"></i>Experimental Visualizations</h5>
                    <div className="row g-4">
                        {analysisData.charts.map((chart: any, index: number) => (
                            <div className="col-lg-6" key={index}>
                                <div className="card h-100 bg-black border-secondary border-opacity-10 shadow-sm">
                                    <div className="card-header border-secondary border-opacity-10 bg-dark bg-opacity-25 fw-bold small text-uppercase ls-1">
                                        {chart.title || `Visual Node ${index + 1}`}
                                    </div>
                                    <div className="card-body p-3" style={{ minHeight: '350px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {chart.chartConfig ? (
                                            <canvas
                                                ref={el => { chartRefs.current[index] = el; }}
                                                style={{ width: '100%', height: '100%' }}
                                            ></canvas>
                                        ) : chart.data ? (
                                            renderRecharts(chart)
                                        ) : (
                                            <div className="text-white-50 small">No data available for chart.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
