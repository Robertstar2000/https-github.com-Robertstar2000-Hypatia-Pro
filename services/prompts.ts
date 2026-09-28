
import { Experiment, FineTuneSettings } from '../config';
import { extractJson } from './api';

/**
 * Retrieves context from previous steps to inform the current prompt.
 * Instead of passing massive full-text outputs, it favors the 'summary' field logic for efficiency.
 */
export const getStepContext = async (experiment: Experiment, currentStepId: number) => {
    const data = experiment.stepData || {};
    
    // Helper to get summary or output, with JSON awareness
    const getC = (step: number) => {
        if (!data[step]) return "Not yet generated.";
        const rawContent = data[step].summary || data[step].output || "Not yet generated.";
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        
        // If the content is JSON (common in Step 1, 2, 7), try to extract the descriptive part
        if (content.trim().startsWith('{') || content.includes('```json')) {
            try {
                const parsed = JSON.parse(extractJson(content));
                
                // Special handling for Step 2 to include actionable data
                if (step === 2 && parsed.synthesis_narrative) {
                    return `${parsed.synthesis_narrative}\n\nACTIONABLE GAPS: ${parsed.evidence_gaps?.join('; ')}\nMECHANISMS: ${parsed.candidate_mechanisms?.join('; ')}`;
                }

                // Special handling for Step 3 Tree of Thought hypothesis
                if (step === 3) {
                    if (parsed.final_hypothesis) {
                        const fh = parsed.final_hypothesis;
                        if (typeof fh === 'string') return fh;
                        const nullH = typeof fh.null_hypothesis === 'string' ? fh.null_hypothesis : (fh.null_hypothesis?.statement || fh.h0 || 'Baseline');
                        const altH = typeof fh.alternative_hypothesis_1 === 'string' ? fh.alternative_hypothesis_1 : (fh.alternative_hypothesis_1?.statement || fh.h1 || 'Experimental effect');
                        return `Null Hypothesis: ${nullH}\nAlternative Hypothesis: ${altH}`;
                    }
                    if (parsed.hypothesis) {
                        return typeof parsed.hypothesis === 'string' ? parsed.hypothesis : JSON.stringify(parsed.hypothesis);
                    }
                }

                // Prefer specific summary fields depending on the step
                return parsed.summary || parsed.synthesis_narrative || parsed.research_question || content;
            } catch (e) {
                return content;
            }
        }
        return content;
    };

    return {
        experimentField: experiment.field,
        experimentMode: experiment.experimentMode,
        question: getC(1),
        literature_review_summary: getC(2),
        hypothesis: getC(3),
        methodology_summary: getC(4),
        data_collection_plan_summary: getC(5),
        experimental_data_summary: getC(6), 
        analysis_summary: getC(7),
        conclusion_summary: getC(8),
        references: (() => {
            try {
                return data[2]?.output ? JSON.parse(extractJson(data[2].output)).references : [];
            } catch (e) {
                return [];
            }
        })(),
        full_project_summary_log: Object.entries(data)
            .filter(([k, v]) => parseInt(k) < currentStepId && (v.summary || v.output))
            .map(([k, v]) => {
                const stepContent = getC(parseInt(k));
                return `Step ${k}: ${stepContent.substring(0, 500)}${stepContent.length > 500 ? '...' : ''}`;
            })
            .join('\n')
    };
};

/**
 * Main prompt factory. Returns the prompt string, JSON expectation flag, and configuration constraints.
 */
export const getPromptForStep = (
    stepId: number, 
    input: string, 
    context: any, 
    fineTune: FineTuneSettings,
    feedback: string = ""
) => {
    let basePrompt = "";
    let expectJson = false;
    let config: any = {};

    const role = `Role: ${context.experimentField} Scientist (Hypatia). Adhere to Scientific Method.`;
    const feedbackInstruction = feedback ? `\n\nFB: "${feedback}"` : "";

    switch (stepId) {
        case 1: // Question
            expectJson = true;
            basePrompt = `${role}
            Analyze the user's initial idea/intent: "${input}".
            
            TUNING PARAMETERS:
            - Uniqueness Enforce Strictness: ${fineTune.uniquenessStrictness ?? 0.5} (Scale 0-1 of strict novelty checks)
            - Scope Focus Dimension: ${fineTune.scopeFocus ?? 'Balanced Inquiry'} (Sets breadth vs niche depth)
            - Scholarly Rigor / Complexity: ${fineTune.complexityLevel ?? 'Postdoctoral'} (Expectations of scholarly complexity)
            - Disciplinary/Methodological Bias: ${fineTune.methodologicalBias ?? 'Balanced'} (Preferred research methodologies orientation)

            CRITICAL DIRECTIVE: You must rewrite the user's stated intent into rigorous, falsifiable scientific language.
            - Restate the exact topic the user wants to investigate in the precise technical/academic dialect of the specific branch of scientific knowledge: "${context.experimentField}", heavily aligning with the UNIQNESS STRICTNESS (${fineTune.uniquenessStrictness ?? 0.5}), SCOPE FOCUS ("${fineTune.scopeFocus ?? 'Balanced Inquiry'}"), COMPLEXITY LEVEL ("${fineTune.complexityLevel ?? 'Postdoctoral'}"), and METHODOLOGICAL BIAS ("${fineTune.methodologicalBias ?? 'Balanced'}").
            - Stay strictly focused on the user's intent. Do NOT add any extraneous information, make ungrounded assumptions, or extend the scope beyond what the user has explicitly requested.
            - Keep the scope ceiling strictly bounded by the user's input.
            
            CRITICAL: YOU MUST OUTPUT ONLY VALID JSON matching the specified schema:
            - "research_question": The rigorously translated research question using the professional dialect of the field.
            - "study_type": ['observational', 'simulation', 'benchmarking', 'controlled_experiment', 'qualitative']
            - "uniqueness_score": (float 0-1)
            - "justification": Scientific justification of the question's focus and its alignment with the user's intent.
            - "measurable_outcomes": Array of strings representing specific variables/metrics directly implied by the user's topic.
            
            ${feedbackInstruction}`;
            break;

        case 2: // Lit Review
            expectJson = true;
            basePrompt = `${role}
            Literature review for: "${context.question}".
            
            TUNING PARAMETERS:
            - Citation Historical Depth: ${fineTune.citationDepth ?? 'Comprehensive Historical-to-Modern'} (Preferred age/depth of citations)
            - Interdisciplinary Aperture: ${fineTune.interdisciplinaryAperture ?? 0.5} (Willingness to draw mechanisms from outside fields)
            - Dispute Stance Tolerance: ${fineTune.disputeTolerance ?? 0.5} (Emphasis on conflicting views and scientific debates)
            - Source Repository Diversity: ${fineTune.sourceDiversity ?? 0.6} (Rigor in searching patents, preprints, and journals)

            Conduct the literature scan and synthesis keeping the CITATION DEPTH ("${fineTune.citationDepth ?? 'Comprehensive Historical-to-Modern'}"), INTERDISCIPLINARY APERTURE (${fineTune.interdisciplinaryAperture ?? 0.5}), DISPUTE TOLERANCE (${fineTune.disputeTolerance ?? 0.5}), and SOURCE DIVERSITY (${fineTune.sourceDiversity ?? 0.6}) in absolute consideration.
            
            Output JSON per schema:
            - "synthesis_narrative": Markdown summary.
            - "evidence_gaps": List.
            - "candidate_mechanisms": List.
            - "references": Array. Use real, verifiable references.
            
            ${feedbackInstruction}`;
            break;

        case 3: // Hypothesis
            expectJson = true;
            config.maxOutputTokens = 8192;
            basePrompt = `${role}
            Formulate max-unique hypothesis based on lit-gaps.
            Tree of Thought (5 layers).
            
            LIT REVIEW CONTEXT: ${context.literature_review_summary}
            RESEARCH QUESTION: ${context.question}
            
            TUNING PARAMETERS:
            - Creativity/Randomness (Temperature): ${fineTune.creativity ?? 0.7}
            - Falsifiability Strictness Bar: ${fineTune.falsifiabilityBar ?? 'Pragmatic & Directly Testable'} (Design testing posture)
            - Mechanical Granularity Level: ${fineTune.mechanismGranularity ?? 'Mechanistic (How)'} (The detail level of the causal pathways)
            - Uniqueness novelty target: ${fineTune.uniquenessTarget ?? 0.8}

            Formulate the hypotheses honoring the CREATIVITY temperature (${fineTune.creativity ?? 0.7}), the FALSIFIABILITY BAR ("${fineTune.falsifiabilityBar ?? 'Pragmatic & Directly Testable'}"), the MECHANICAL GRANULARITY ("${fineTune.mechanismGranularity ?? 'Mechanistic (How)'}"), and the UNIQUENESS TARGET (${fineTune.uniquenessTarget ?? 0.8}).
            
            1. Criteria: Uniqueness, Utility, Falsifiability.
            2. 5 layers, 2 hypothesis candidates/layer.
            3. Score candidates (0.0-1.0), prune low scorer.
            4. Select best branch for next layer refinement.
            5. Final: Null & Alternative Hypotheses based on best candidate.
            
            CRITICAL: Output valid JSON per schema. 
            Ensure all strings are properly closed and escaped. No trailing commas.
            Do NOT include any markdown code block syntax (like \`\`\`json ... \`\`\`) or any other conversational text in the output.
            Output ONLY the raw JSON string that perfectly matches the provided schema.
            
            STRICT LENGTH CONSTRAINT: Keep all draft descriptions, hypothesis drafts, criteria descriptions, and pruning reasons extremely short and concise (max 1 sentence or 15 words each). This is a hard requirement to ensure the JSON does not exceed token limits and is never truncated.
            
            ${feedbackInstruction}`;
            break;

        case 4: // Methodology
            const designInstruction = context.experimentMode === 'simulation' 
                ? "Design simulation experiment: code libs, data generation, accuracy validation."
                : "Design physical experiment: apparatus, data entry template.";
            basePrompt = `${role}
            Draft a Detailed experimental methodology for:
            
            HYPOTHESIS: ${context.hypothesis}
            MODE: ${context.experimentMode}
            
            TUNING PARAMETERS:
            - Primary Study Design Class: ${fineTune.designClass ?? 'Randomized Controlled Trial'} (The core trial architecture)
            - Confounding Control Matcher: ${fineTune.confoundingControl ?? 'Standard Matching'} (Technique for covariate balancing)
            - Recommended Sizing Scale: ${fineTune.sampleScaleGuideline ?? 'Standard Clinical/Lab (N = 100-500)'} (Instruction for sample counts)
            - Protocol Sparsity / Procedural Detail: ${fineTune.treatmentSparsity ?? 0.7} (How granular the procedure steps should be)

            Incorporate the specified STUDY DESIGN CLASS ("${fineTune.designClass ?? 'Randomized Controlled Trial'}"), CONFOUNDING CONTROL ("${fineTune.confoundingControl ?? 'Standard Matching'}"), SAMPLE SCALE ("${fineTune.sampleScaleGuideline ?? 'Standard Clinical/Lab (N = 100-500)'}"), and TREATMENT PROTOCOL SPARSITY (${fineTune.treatmentSparsity ?? 0.7}) into your instructions and procedure steps.
            
            ${designInstruction}
            
            Include: Design, Variables, Materials/Equipment, Subjects, Step-by-step Procedure, Validation.
            
            ${feedbackInstruction}`;
            break;

        case 5: // Data Plan
            basePrompt = `${role}
            Create a Data collection plan for methodology: ${context.methodology_summary}
            Define data capture format & measurement frequency.
            
            TUNING PARAMETERS:
            - Significance Criterion (Alpha): ${fineTune.significanceThreshold ?? 'Alpha = 0.05 (Standard)'} (Null-hypothesis decision criteria)
            - Multiple Testing Correction Strategy: ${fineTune.multipleTestingCorrection ?? 'None'} (Correction strategy for multiple comparisons)
            - Missing Data Handling Strategy: ${fineTune.missingDataStrategy ?? 'Listwise Deletion'} (How the plan instructs handling missing values)
            - Outlier Isolation Threshold: ${fineTune.outlierThreshold ?? 2.5} IQRs (Strictness of outlier filtering guidelines)

            Construct the measurement plan with direct reference to the SIGNIFICANCE THRESHOLD ("${fineTune.significanceThreshold ?? 'Alpha = 0.05 (Standard)'}"), MULTIPLE TESTING CORRECTION ("${fineTune.multipleTestingCorrection ?? 'None'}"), MISSING DATA STRATEGY ("${fineTune.missingDataStrategy ?? 'Listwise Deletion'}"), and OUTLIER THRESHOLD (${fineTune.outlierThreshold ?? 2.5} IQRs).
            
            CRITICAL REQUIREMENT:
            Because the next step generates a simulation script to run the experiment, you MUST provide:
            1. A clear template/schema of the INPUT data (the initial variables, starting states, or control parameters).
            2. A clear template/schema of the OUTPUT data (the resulting measurements, observations, or final states).
            
            This must specify how the simulation code needs to transform the input data into the output data to test the hypothesis: "${context.hypothesis}".
            
            ${feedbackInstruction}`;
            break;

        case 6: // Experiment Runner / Data Synthesis
            basePrompt = `${role}
            Generate synthetic CSV data for testing hypothesis: "${context.hypothesis}".
            
            METHODOLOGY: ${context.methodology_summary}
            DATA PLAN: ${context.data_collection_plan_summary}
            
            TUNING PARAMETERS:
            - Output Gaussian Noise Level: ${fineTune.noiseLevel ?? 0.15} (Standard deviation of noise added to outputs)
            - Missing/Null Record Probability: ${fineTune.missingnessProbability ?? 0.05} (Frequency of blank values to trigger cleaning)
            - Effect Size Multiplier: ${fineTune.effectSizeMultiplier ?? 1.2} (Strength of simulated signal between variables)
            - Extreme Anomaly Rate: ${fineTune.anomalyRate ?? 0.02} (Inject rare out-of-bound errors)

            Simulate realistic study data in CSV format adhering strictly to the NOISE LEVEL (${fineTune.noiseLevel ?? 0.15}), MISSINGNESS PROBABILITY (${fineTune.missingnessProbability ?? 0.05}), EFFECT SIZE MULTIPLIER (${fineTune.effectSizeMultiplier ?? 1.2}), and ANOMALY RATE (${fineTune.anomalyRate ?? 0.02}).
            - Clear headers matching defined variables.
            - Realistic rows/measurements.
            - Plausible patterns/correlation.
            
            Output RAW CSV only. No markdown.
            ${feedbackInstruction}`;
            break;

        case 7: // Analysis
            expectJson = true;
            basePrompt = `${role}
            Analyze data: csvData provided in system context.
            
            CONTEXT:
            - Question: ${context.question}
            - Hypothesis: ${context.hypothesis}
            
            TUNING PARAMETERS:
            - Visualization Layout Theme: ${fineTune.chartAesthetic ?? 'Scientific Journal (Nature)'} (Style aesthetic guidelines)
            - Regression Fit Model: ${fineTune.regressionComplexity ?? 'Linear & Logistic'} (The mathematical model to fit)
            - Confidence Bounds Width: ${fineTune.confidenceIntervals ?? 'Standard 95%'} (Interval calculation depth)
            - Interaction Modeling Strategy: ${fineTune.interactionTerms ?? 'No interaction effects'} (Checking for interaction effects)

            Run statistical computations applying the selected REGRESSION COMPLEXITY ("${fineTune.regressionComplexity ?? 'Linear & Logistic'}"), CONFIDENCE INTERVALS ("${fineTune.confidenceIntervals ?? 'Standard 95%'}"), and INTERACTION TERMS ("${fineTune.interactionTerms ?? 'No interaction effects'}"). Style all chart outputs conforming to CHART AESTHETIC ("${fineTune.chartAesthetic ?? 'Scientific Journal (Nature)'}").
            
            Execute statistical tests.
            Output JSON with "summary", "statistical_outputs", and "charts".
            
            ${feedbackInstruction}`;
            break;

        case 8: // Conclusion
            basePrompt = `${role}
            Synthesize the findings from the analysis node.
            
            RESULTS: ${context.analysis_summary}
            HYPOTHESIS: ${context.hypothesis}
            
            TUNING PARAMETERS:
            - Self-Skepticism Stance: ${fineTune.skepticismIndex ?? 0.5} (How critically to audit findings and avoid overclaims)
            - External Validity Boundaries: ${fineTune.generalizabilityBound ?? 'Moderate Geographic/Domain Generalizability'} (Strictness of claim scaling)
            - Publication Bias Method: ${fineTune.publicationBiasCorrection ?? 'Uncorrected'} (Correcting for reporting bias)
            - Stance on Causality: ${fineTune.causalConfidence ?? 'Strictly Associational'} (Claim strength)

            Synthesize conclusions keeping in full alignment with the SKEPTICISM INDEX (${fineTune.skepticismIndex ?? 0.5}), GENERALIZABILITY BOUND ("${fineTune.generalizabilityBound ?? 'Moderate Geographic/Domain Generalizability'}"), PUBLICATION BIAS CORRECTION ("${fineTune.publicationBiasCorrection ?? 'Uncorrected'}"), and CAUSAL CONFIDENCE ("${fineTune.causalConfidence ?? 'Strictly Associational'}").
            
            Evaluate supporting evidence, discuss limitations, robustness.
            ${feedbackInstruction}`;
            break;

        case 9: // Peer Review
            basePrompt = `${role}
            Simulate a skeptical peer review of this project.
            
            PROJECT LOG:
            ${context.full_project_summary_log}
            
            TUNING PARAMETERS:
            - Active Reviewer Lens Persona: ${fineTune.reviewerPersona ?? 'Methodological Purist'}
            - Critiquing Severity / Audit Rigor: ${fineTune.auditRigor ?? 'Standard Editorial Review'} (How critical/harsh the reviewer is)
            - Analysis Focus Target Area: ${fineTune.focusArea ?? 'Comprehensive Audit'} (Key focus category)
            - Willingness to Approve: ${fineTune.compromiseLevel ?? 0.5} (Approval readiness)

            Generate the simulated peer critiques incorporating the specific REVIEWER PERSONA ("${fineTune.reviewerPersona ?? 'Methodological Purist'}"), AUDIT RIGOR ("${fineTune.auditRigor ?? 'Standard Editorial Review'}"), FOCUS AREA ("${fineTune.focusArea ?? 'Comprehensive Audit'}"), and COMPROMISE LEVEL (${fineTune.compromiseLevel ?? 0.5}).
            
            ${feedbackInstruction}`;
            break;

        case 10: // Publication
            basePrompt = `${role}
            Draft a comprehensive, highly detailed, and extremely verbose scientific publication based on the entire project log.
            
            PROJECT LOG:
            ${context.full_project_summary_log}

            REFERENCES TO USE (FOR CITATIONS):
            ${JSON.stringify(context.references)}

            TUNING PARAMETERS:
            - Target Journal Format Archetype: ${fineTune.journalStyle ?? 'Nature/Science (High Impact)'}
            - Document Physical Verbosity Depth: ${fineTune.verbosityLevel ?? 'Standard Article (8-12 pages equivalent)'}
            - Grounding & Synthesis Rigor: ${fineTune.groundingRigor ?? 'Synthesized (Highly integrated with literature reviews)'}
            - Reference Citation Format Standard: ${fineTune.citationFormat ?? 'APA 7th Edition'}

            CRITICAL DISCIPLINARY & VERBOSITY REQUIREMENTS:
            1. EXHAUSTIVE EXPLANATIONS & RATIONALE: Provide extremely verbose, clear, and comprehensive explanations of the research topic, experimental hypotheses, and the chemical/physical/biological/logical mechanisms involved. Do not summarize or use brief placeholders. Fully elaborate on why the specific independent variables are hypothesized to impact the dependent variables, referencing the exact scientific pathways.
            2. ACCESSIBLE & RIGOROUS LANGUAGE: Write with the vocabulary and precision of a top-tier scientific journal conforming to the TARGET JOURNAL STYLE ("${fineTune.journalStyle ?? 'Nature/Science (High Impact)'}"). Explain complex methodologies and statistical findings with maximum clarity so an interdisciplinary reader can trace the theoretical and empirical flow of your inquiry. Match the requested DOCUMENT VERBOSITY DEPTH ("${fineTune.verbosityLevel ?? 'Standard Article (8-12 pages equivalent)'}").
            3. FORMULAS & NOMENCLATURE: Display all mathematical models, physical/chemical formulas, and equations in a highly detailed, standard scientific format (e.g., H~2~O, E = mc^2^, or standard regression model equations like Y = &beta;~0~ + &beta;~1~X~1~ + &epsilon;). Use ~subscript~ and ^superscript^ HTML tag notations for clarity.
            4. CITATIONS & GROUNDED BIBLIOGRAPHY:
               - Rigorously ground your arguments in the literature by citing the exact papers from the "REFERENCES TO USE" block above using CITATION FORMAT ("${fineTune.citationFormat ?? 'APA 7th Edition'}").
               - Place numbered citation anchors (e.g., [1], [2]) correctly within the text where historical context, prior findings, or mechanism theories are discussed.
               - Ensure citations are ordered sequentially based on their first appearance.
               - List all cited papers in a dedicated, extremely detailed "References" section at the end of the manuscript. For each reference, include: Full Author list, Year, Article Title, Journal Name, and URL.
            5. DATA PROVENANCE & LIMITATIONS: In the Methods, Results, and Discussion sections, you MUST explicitly detail the data acquisition methodology (e.g., "AI-simulated data", "synthetic dataset", or "manual entry"). Provide a rigorous discussion on the strengths and limitations of using simulated datasets.
            
            Structure: Abstract, Introduction, Methods, Results, Discussion, References.
            ${feedbackInstruction}`;
            break;
            
        case 13: // Explanation
             basePrompt = `${role}
             Explain the findings of this research paper in simple terms for a general audience.
             
             PROJECT CONTEXT:
             ${context.conclusion_summary}
             `;
             break;

        default:
            basePrompt = `${role} Generate content for step ${stepId}. input: ${input}`;
    }

    return { basePrompt, expectJson, config };
};