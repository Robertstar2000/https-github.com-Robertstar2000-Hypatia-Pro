import React, { useState, useEffect, useRef } from 'react';
import { useExperiment, runDataQA } from '../../../services';
import { useToast } from '../../../toast';
import { parseGeminiError, callGeminiWithRetry, safeGetText } from '../../../services';
import { AgenticAnalysisView } from '../../common/AgenticAnalysisView';
import { SCIENCE_LIB } from '../../../utils/scienceLib';
import { cleanAndFormatCsv, validateSimulationSchema } from '../../../utils/csvUtils';

const extractJSCode = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    // Match standard ```javascript or ```js code blocks
    const jsBlockRegex = /```(?:javascript|js)\s*([\s\S]*?)\s*```/i;
    let match = text.match(jsBlockRegex);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Match any ``` code blocks
    const genericBlockRegex = /```\s*([\s\S]*?)\s*```/i;
    match = text.match(genericBlockRegex);
    if (match && match[1]) {
        return match[1].trim();
    }
    return text.trim();
};

const SCIENCE_LIB_API_DOCS = `
The following global objects and helper functions are injected and available to use:
- console.log(msg): Use this to print debug messages.
- science.physics.calculateGravity(m1, m2, r): returns gravity force
- science.physics.calculateForce(m, a): returns force
- science.physics.calculateKineticEnergy(m, v): returns kinetic energy
- science.physics.calculatePotentialEnergy(m, h, g): returns potential energy
- science.physics.calculateVelocity(v0, a, t): returns velocity
- science.physics.calculateDisplacement(v0, a, t): returns displacement
- science.physics.calculatePressure(f, a): returns pressure
- science.physics.calculateDensity(m, v): returns density
- science.chemistry.calculateMolarity(moles, volume): returns molarity
- science.chemistry.calculatePH(hConcentration): returns pH
- science.chemistry.calculateHConcentration(ph): returns [H+] concentration
- science.chemistry.calculateReactionRate(k, concentrations): returns reaction rate
- science.chemistry.calculateIdealGas(p, v, n, t): ideal gas law calculator
- science.chemistry.calculateArrhenius(A, Ea, T): Arrhenius equation
- science.stats.normalRandom(mean, stdDev): returns a random number from a normal distribution
- science.stats.clamp(val, min, max): clamps value between min and max
- science.stats.lerp(a, b, t): linear interpolation
- science.stats.noise(val, intensity): adds random scaling noise to a value (intensity defaults to 0.05)
`;

const CODE_HARNESS_TEMPLATE = `
// --- CODE TEMPLATE AND INTEGRATION HARNESS ---
// Ensure you construct a valid RFC 4180 CSV string with correct column headers and rows, and no empty values.
// MANDATORY REQUIREMENT: Generate exactly N=100 agent records in a loop.
// Finally, you MUST invoke: hypatia.finish(csvString, summaryText);

// Example harness:
const data = [];
const sampleSize = 100; // Strict N=100 agent record requirement

for (let i = 0; i < sampleSize; i++) {
    // Generate inputs (independent variables)
    const timeVal = i * 0.5; // e.g., seconds
    
    // Calculate outputs (dependent variables) using science library and statistical noise
    const baseVelocity = science.physics.calculateVelocity(0, 9.8, timeVal);
    // Add realistic scientific noise to make the dataset look organic
    const observedVelocity = science.stats.noise(baseVelocity, 0.03);
    
    // Store row details (ensure non-null for all columns)
    data.push({
        time: timeVal.toFixed(2),
        velocity: observedVelocity.toFixed(4)
    });
}

// Convert to CSV string (standard comma-separated format)
const headers = "time,velocity\\n";
const rows = data.map(row => \`\${row.time},\${row.velocity}\`).join("\\n");
const csvData = headers + rows;

const summary = "A physical simulation of velocity over time under constant gravity, modeling organic measurement noise with N=100 agent records.";

// Finish execution
hypatia.finish(csvData, summary);
`;

export const CodeSimulator = ({ onComplete, context }) => {
    const { activeExperiment, updateExperiment, isAuthenticated } = useExperiment();
    const [code, setCode] = useState(() => {
        const stored = activeExperiment.stepData[6]?.simulationCode;
        if (stored) return stored;
        const inputVal = activeExperiment.stepData[6]?.input || '';
        if (inputVal && !inputVal.includes(',') && !inputVal.includes('\n')) {
            return inputVal;
        }
        if (inputVal && (inputVal.includes('const') || inputVal.includes('let') || inputVal.includes('function'))) {
            return inputVal;
        }
        return '';
    });
    
    const saveCodeToDb = (newCode: string) => {
        const updatedStepData = { ...(activeExperiment.stepData || {}) };
        updatedStepData[6] = { ...(updatedStepData[6] || {}), simulationCode: newCode };
        updateExperiment({ ...activeExperiment, stepData: updatedStepData }).catch(err => {
            console.error("Auto-saving code failed:", err);
        });
    };
    const [isInitializing, setIsInitializing] = useState(false);
    const [initLogs, setInitLogs] = useState([]);
    const { addToast } = useToast();
    const workerRef = useRef<Worker | null>(null);
    const workerUrlRef = useRef<string | null>(null);
    const isMounted = useRef(true);
    const isCancelledRef = useRef(false);

    const [agenticRun, setAgenticRun] = useState({
        status: 'idle', 
        logs: [],
        iterations: 0,
        maxIterations: 10,
    });

    const handleCancelSimulation = () => {
        isCancelledRef.current = true;
        if (workerRef.current) {
            try { workerRef.current.terminate(); } catch (e) {}
        }
        setAgenticRun(prev => ({
            ...prev,
            status: 'failed',
            logs: [...prev.logs, { agent: 'System', message: 'Simulation cancelled by user.' }]
        }));
    };

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);
    
    useEffect(() => {
        return () => { 
            if (workerRef.current) {
                try { workerRef.current.terminate(); } catch (e) {}
            }
            if (workerUrlRef.current) {
                try { URL.revokeObjectURL(workerUrlRef.current); } catch (e) {}
            }
        };
    }, []);

    useEffect(() => {
        if (!code && isAuthenticated) {
            const runInitializationAgent = async () => {
                if (!isMounted.current) return;
                setIsInitializing(true);
                const log = (agent, message) => {
                    if (isMounted.current) setInitLogs(prev => [...prev, { agent, message }]);
                };
                try {
                    log('Simplifier', 'Extracting experimental variables from methodology...');
                    
                    const simplifierPrompt = `
                        ACT AS: Senior Research Data Scientist.
                        TASK: Translate the following Experimental Methodology and Data Plan into a logical simulation specification for a coder.

                        INPUT CONTEXT:
                        - Hypothesis: "${context.hypothesis}"
                        - Methodology: "${context.methodology_summary?.substring(0, 5000)}"
                        - Data Plan (containing Input & Output Data Templates): "${context.data_collection_plan_summary?.substring(0, 5000)}"

                        OUTPUT SPECIFICATION:
                        1. Identify the **Independent Variable** and **Dependent Variable**.
                        2. Define a **plausible mathematical relationship** (Linear, Logarithmic, Exponential, etc.).
                        3. Specify **Sample Size**: MUST BE STRICTLY N=100 agent records to satisfy experimental data power requirements.
                        4. Provide a schema/logic mapping that utilizes the defined **INPUT data template** and **OUTPUT data template** from the Data Plan, ensuring the simulation code models the transformation of the input data into the output data to test the hypothesis.
                        
                        COMPLEXITY LIMITATION RULES:
                        - Keep the simulation algorithm direct and transparent. Avoid complex helper systems, nested iterations, or recursion.
                        - Outline a single sequential loop structure that creates sample records and maps them cleanly.
                    `;
                    
                    const simplifierResponse = await callGeminiWithRetry('gemini-3.5-flash', { 
                        contents: simplifierPrompt 
                    });
                    if (!isMounted.current) return;
                    const instructions = safeGetText(simplifierResponse);
                    
                    log('Coder', 'Generating autonomous simulation script (N=100 agent record specification)...');
                    
                    const coderPrompt = `
                        Role: Scientific JS Developer.
                        Task: Write a Web Worker script for simulation.

                        LOGIC SPECIFICATION:
                        ${instructions}

                        REQUIRED ENVIRONMENT API:
                        ${SCIENCE_LIB_API_DOCS}

                        SKELETON CODE HARNESS TEMPLATE:
                        ${CODE_HARNESS_TEMPLATE}

                        REQUIREMENTS:
                        1. CSV RFC 4180 compliant: column headers MUST exactly match the independent and dependent variables, comma-separated, with no empty cells or null values.
                        2. STRICT N=100 RECORD REQUIREMENT: The column generation loop MUST iterate exactly N=100 times to generate 100 agent records.
                        3. Organic Variance: Apply realistic statistical noise using science.stats.noise or science.stats.normalRandom.
                        4. Finish: You MUST call \`hypatia.finish(csvString, summary)\`.

                        COMPLEXITY LIMITATIONS & DEBUGGING RESTRICTIONS:
                        - KEEP IT SIMPLE: Write extremely direct, flat, and transparent JavaScript code. Avoid complex object structures, classes, heavy mathematical packages, or multi-threaded worker spawns.
                        - Use simple, well-defined variables and loops.
                        - Do not invent functions outside of what is documented in the environment API.
                        - Check for division by zero, invalid log parameters, and NaN values.

                        RESTRICTIONS:
                        - NO DOM/window access. Use ONLY pure JavaScript.
                        - Do not write standard HTML or markdown outside code blocks.
                        - Output ONLY the raw JS code inside a \`\`\`javascript block.
                    `;
                    
                    const coderResponse = await callGeminiWithRetry('gemini-3.5-flash', { 
                        contents: coderPrompt 
                    });
                    if (!isMounted.current) return;
                    const initialCode = extractJSCode(safeGetText(coderResponse));
                    setCode(initialCode);
                    saveCodeToDb(initialCode);
                    log('Coder', 'Initial script ready for testing.');
                } catch (err) {
                    if (isMounted.current) addToast("Failed to initialize coder.", "danger");
                } finally { 
                    if (isMounted.current) setIsInitializing(false); 
                }
            };
            runInitializationAgent();
        }
    }, [isAuthenticated, context, code, addToast]);

    const executeCodeInWorker = (codeToRun: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            // Terminate previous worker if any
            if (workerRef.current) {
                try { workerRef.current.terminate(); } catch (e) {}
            }
            if (workerUrlRef.current) {
                try { URL.revokeObjectURL(workerUrlRef.current); } catch (e) {}
            }

            // Create a fresh worker for this specific run
            const workerCode = `
                ${SCIENCE_LIB}
                self.onmessage = (event) => {
                    const { code } = event.data;
                    let finished = false;
                    const hypatia = {
                        finish: (data, summary) => {
                            self.postMessage({ type: 'finish', payload: { data, summary } });
                            finished = true;
                        }
                    };
                    const consoleProxy = {
                        log: (...args) => {
                            const logMsg = args.map(arg => String(arg)).join(' ');
                            self.postMessage({ type: 'log', payload: logMsg });
                        }
                    };
                    try {
                        new Function('console', 'hypatia', 'science', code)(consoleProxy, hypatia, science);
                        if (!finished) self.postMessage({ type: 'done' });
                    } catch (e) {
                        self.postMessage({ type: 'error', payload: \`[\${e.name}] \${e.message}\` });
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            workerUrlRef.current = url;
            
            const worker = new Worker(url);
            workerRef.current = worker;

            let timeoutId: any;
            const messageHandler = (event) => {
                const { type, payload } = event.data;
                if (type === 'log' && isMounted.current) {
                    setAgenticRun(prev => ({ ...prev, logs: [...prev.logs, { agent: 'Simulator', message: payload }] }));
                }
                if (type === 'finish' || type === 'done' || type === 'error') {
                    clearTimeout(timeoutId);
                    worker.removeEventListener('message', messageHandler);
                    worker.terminate();
                    if (type === 'error') reject(payload); else resolve({ type, payload });
                }
            };
            
            timeoutId = setTimeout(() => {
                worker.removeEventListener('message', messageHandler);
                worker.terminate();
                reject("Execution Timeout: Simulation hung for over 15 seconds.");
            }, 15000);

            worker.addEventListener('message', messageHandler);
            worker.postMessage({ code: codeToRun });
        });
    };

    const runAgenticSimulation = async () => {
        if (agenticRun.status === 'running') return;
        saveCodeToDb(code);
        isCancelledRef.current = false;
        setAgenticRun(prev => ({ ...prev, status: 'running', logs: [], iterations: 0 }));
        
        let currentCode = code;
        for (let i = 0; i < agenticRun.maxIterations; i++) {
            if (!isMounted.current) return;
            if (isCancelledRef.current) return;
            
            setAgenticRun(prev => ({ 
                ...prev, 
                iterations: i + 1, 
                logs: [...prev.logs, { agent: 'System', message: `Attempt ${i + 1}: Executing simulation code...` }] 
            }));
            
            try {
                const result = await executeCodeInWorker(currentCode);
                if (!isMounted.current) return;
                if (isCancelledRef.current) return;
                
                if (result.type === 'finish') {
                    const formattedData = cleanAndFormatCsv(result.payload.data);
                    
                    // 1. Strict Schema Validation Check (N=100 agent record requirement & non-malformed column values)
                    setAgenticRun(prev => ({ ...prev, logs: [...prev.logs, { agent: 'Schema Validator', message: 'Executing strict schema validation check (N=100 agent record verification)...' }] }));
                    const schemaResult = validateSimulationSchema(formattedData, 100);
                    if (!schemaResult.isValid) {
                        const malformedMsg = schemaResult.malformedColumns.length > 0 
                            ? ` [Malformed Columns: ${schemaResult.malformedColumns.join(', ')}]` 
                            : '';
                        throw new Error(`Schema Validation Failure (N=100 Agent Record Requirement): ${schemaResult.errors.join('; ')}${malformedMsg}`);
                    }

                    // 2. Data QA Audit
                    setAgenticRun(prev => ({ ...prev, logs: [...prev.logs, { agent: 'QA Auditor', message: 'Analyzing simulation output for formatting and scientific integrity...' }] }));
                    const qaResult = await runDataQA(formattedData, context);
                    if (isCancelledRef.current) return;
                    
                    if (qaResult.is_valid && qaResult.quality_score >= 0.4) {
                        setAgenticRun(prev => ({ ...prev, status: 'success' }));
                        onComplete(formattedData, result.payload.summary, currentCode);
                        return;
                    } else {
                        throw new Error(`Data QA Failure: ${qaResult.issues.join(', ')}`);
                    }
                }
                throw new Error("Simulation execution completed but hypatia.finish() was never invoked.");
            } catch (error) {
                if (!isMounted.current) return;
                if (isCancelledRef.current) return;
                
                const errorStr = error instanceof Error ? error.message : String(error);
                const isLastAttempt = i === agenticRun.maxIterations - 1;
                const message = `Attempt ${i + 1} failed: ${errorStr}. ${isLastAttempt ? 'Simulation aborted.' : 'Targeting simulation script column loop for re-healing...'}`;
                
                setAgenticRun(prev => ({ 
                    ...prev, 
                    logs: [...prev.logs, { agent: 'Debugger', message }] 
                }));
                
                if (isLastAttempt) break;

                 const debuggerPrompt = `
                    ACT AS: Expert Scientific Code Debugger.
                    TASK: Target and re-heal ONLY the simulation script's column generation loop and row creation logic.

                    RESEARCH CONTEXT:
                    - Question: ${context.question}
                    - Hypothesis: ${context.hypothesis}
                    - Methodology: ${context.methodology_summary}

                    EXECUTION / SCHEMA AUDIT FAILURE DETAILS:
                    ${errorStr}

                    REQUIRED ENVIRONMENT API:
                    ${SCIENCE_LIB_API_DOCS}

                    TARGETED RE-HEALING MANDATE:
                    1. SPECIFICALLY TARGET THE COLUMN GENERATION LOOP: Do NOT rewrite the entire script setup, helper libraries, or global structure. Focus re-healing on the column generation loop (the \`for\` loop / iteration block) and the output row assembly.
                    2. STRICT RECORD COUNT ENFORCEMENT: Set the iteration limit to exactly N=100 agent records (\`sampleSize = 100\`).
                    3. RE-HEAL MALFORMED COLUMNS: Ensure that every column variable calculated inside the loop evaluates to a valid, non-NaN, non-null, non-empty numeric or string value for every row iteration.
                    4. CALL FINISH PROTOCOL: Finish with \`hypatia.finish(csvString, summary)\` returning a complete 100-row CSV string with headers.

                    PREVIOUS SCRIPT WITH MALFORMED LOOP:
                    \`\`\`javascript
                    ${currentCode}
                    \`\`\`

                    Return ONLY the re-healed JS code inside a \`\`\`javascript block. Do not write conversational text outside the block.
                `;
                
                try {
                    const res = await callGeminiWithRetry('gemini-3.5-flash', { contents: debuggerPrompt });
                    if (isMounted.current) {
                        if (isCancelledRef.current) return;
                        currentCode = extractJSCode(safeGetText(res));
                        setCode(currentCode);
                        saveCodeToDb(currentCode);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } catch (e) {
                    if (isMounted.current) addToast("Self-healing link unstable.", "warning");
                }
            }
        }
        if (isMounted.current && !isCancelledRef.current) setAgenticRun(prev => ({ ...prev, status: 'failed' }));
    };

    return (
        <div>
            <div className="doc-section mb-3">
                <h6 className="fw-bold">AI Agent Simulation Hub</h6>
                <p className="small text-white-50">Simulation protocol: Enforcing perfect CSV structure and complete data capture.</p>
            </div>
            {isInitializing && <AgenticAnalysisView agenticRun={{logs: initLogs, iterations: 0, maxIterations: 0}} title="Coder Agent Initializing..." />}
            <textarea 
                id="code-editor" 
                className="form-control mb-3 font-monospace bg-black text-primary-glow border-secondary border-opacity-25" 
                style={{ height: '300px', fontSize: '0.85rem' }}
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                onBlur={(e) => saveCodeToDb(e.target.value)}
            />
            {agenticRun.status === 'running' ? (
                <button className="btn btn-danger w-100" onClick={handleCancelSimulation}>
                    <i className="bi bi-x-circle me-1"></i> Cancel Simulation
                </button>
            ) : (
                <button className="btn btn-primary w-100" onClick={runAgenticSimulation} disabled={!code}>
                    Start Agentic Simulation
                </button>
            )}
            {agenticRun.logs.length > 0 && <AgenticAnalysisView agenticRun={agenticRun} title="Self-Healing Debugger Log" />}
        </div>
    );
};