/**
 * Comprehensive Scientific Fields Taxonomy, Domain Profiles, and Terminology Adapters.
 * Defines categorized disciplines, standard nomenclatures, literature search indices,
 * and field-tailored ontological directives for the research arc.
 */

export interface ScientificFieldCategory {
    id: string;
    name: string;
    icon: string;
    description: string;
    fields: string[];
}

export interface FieldProfile {
    field: string;
    name: string;
    category: string;
    primaryDatabases: string[];
    terminologyGuidelines: string;
    preferredOntologies: string[];
    literatureSearchKeywords: string[];
    methodologicalFocus: string;
    sampleQuestions: string[];
}

export const SCIENTIFIC_FIELD_CATEGORIES: ScientificFieldCategory[] = [
    {
        id: 'life-sciences',
        name: 'Biological & Life Sciences',
        icon: 'bi-flower1',
        description: 'Molecular mechanisms, cellular dynamics, genetics, organismal biology, and ecosystems.',
        fields: [
            'Biology (General)',
            'Molecular & Cellular Biology',
            'Biochemistry & Molecular Biophysics',
            'Genetics & Genomics',
            'Bioinformatics & Computational Biology',
            'Microbiology & Virology',
            'Immunology & Immunotherapy',
            'Neuroscience & Neurobiology',
            'Physiology & Pathophysiology',
            'Pharmacology & Toxicology',
            'Ecology & Evolutionary Biology',
            'Plant Biology & Botany',
            'Marine Biology & Ocean Ecology',
            'Zoology & Animal Physiology',
            'Structural Biology & Cryo-EM',
            'Synthetic Biology & Metabolic Engineering',
            'Developmental Biology & Stem Cells'
        ]
    },
    {
        id: 'medical-sciences',
        name: 'Medical & Clinical Sciences',
        icon: 'bi-heart-pulse-fill',
        description: 'Human pathology, translational therapeutics, oncology, clinical trials, and epidemiology.',
        fields: [
            'Medicine & Clinical Research (General)',
            'Oncology & Cancer Biology',
            'Infectious Diseases & Medical Virology',
            'Cardiology & Cardiovascular Medicine',
            'Neurology & Clinical Neurosciences',
            'Endocrinology & Metabolic Disorders',
            'Epidemiology & Global Public Health',
            'Pharmacotherapy & Clinical Trials',
            'Genomic & Precision Medicine',
            'Psychiatry & Behavioral Medicine',
            'Translational Medicine & Biomarkers',
            'Pathology & Laboratory Medicine',
            'Radiology & Biomedical Imaging',
            'Biomedical Engineering & Regenerative Medicine'
        ]
    },
    {
        id: 'physical-sciences',
        name: 'Physical Sciences & Astronomy',
        icon: 'bi-stars',
        description: 'Fundamental interactions, astrophysics, quantum mechanics, condensed matter, and optics.',
        fields: [
            'Physics (General)',
            'Astrophysics & Observational Cosmology',
            'Quantum Physics & Quantum Optics',
            'Condensed Matter & Solid State Physics',
            'Nuclear & High Energy Particle Physics',
            'Atomic, Molecular & Optical (AMO) Physics',
            'Plasma Physics & Controlled Fusion',
            'Biophysics & Biological Soft Matter',
            'Geophysics & Planetary Physics',
            'Theoretical & Mathematical Physics',
            'Optics, Lasers & Photonics',
            'Acoustics & Non-linear Dynamics'
        ]
    },
    {
        id: 'chemical-sciences',
        name: 'Chemical Sciences',
        icon: 'bi-droplet-half',
        description: 'Molecular synthesis, spectroscopy, catalysis, material design, and chemical reaction kinetics.',
        fields: [
            'Chemistry (General)',
            'Organic Chemistry & Total Synthesis',
            'Inorganic & Coordination Chemistry',
            'Physical Chemistry & Spectroscopy',
            'Analytical Chemistry & Mass Spectrometry',
            'Computational & Quantum Chemistry',
            'Materials Chemistry & Nanotechnology',
            'Polymer & Macromolecular Chemistry',
            'Chemical Biology & Medicinal Chemistry',
            'Electrochemistry & Battery Science',
            'Environmental & Green Chemistry',
            'Catalysis & Surface Science'
        ]
    },
    {
        id: 'earth-environmental',
        name: 'Earth, Planetary & Environmental Sciences',
        icon: 'bi-globe-americas',
        description: 'Geodynamics, climatology, oceanography, biogeochemical cycles, and environmental sustainability.',
        fields: [
            'Earth & Planetary Sciences (General)',
            'Climatology & Paleoclimate Dynamics',
            'Atmospheric Sciences & Meteorology',
            'Oceanography & Marine Biogeochemistry',
            'Geology, Mineralogy & Petrology',
            'Hydrology & Hydrogeological Modeling',
            'Paleontology & Geobiology',
            'Environmental Science & Ecosystem Dynamics',
            'Soil Science & Carbon Sequestration',
            'Volcanology & Plate Tectonics',
            'Planetary Geology & Exoplanetology'
        ]
    },
    {
        id: 'computer-ai',
        name: 'Computer Science & Artificial Intelligence',
        icon: 'bi-cpu-fill',
        description: 'Machine learning, algorithmic systems, robotics, distributed architectures, and cyber-security.',
        fields: [
            'Computer Science (General)',
            'Artificial Intelligence & Machine Learning',
            'Deep Learning & Foundation Models',
            'Natural Language Processing & Computational Linguistics',
            'Computer Vision & Visual Computing',
            'Robotics & Autonomous Systems',
            'Quantum Computing & Quantum Algorithms',
            'Cybersecurity, Cryptography & Privacy',
            'Distributed Systems & Cloud Infrastructure',
            'Human-Computer Interaction (HCI)',
            'Data Science & Big Data Engineering',
            'Computational Complexity & Graph Algorithms',
            'Health Informatics & Medical AI',
            'Software Engineering & Formal Verification'
        ]
    },
    {
        id: 'mathematical-sciences',
        name: 'Mathematical & Formal Sciences',
        icon: 'bi-calculator-fill',
        description: 'Pure algebra, topology, differential geometry, biostatistics, probability, and optimization.',
        fields: [
            'Mathematics (General)',
            'Pure Mathematics (Algebra, Topology, Analysis)',
            'Applied Mathematics & Differential Equations',
            'Statistics & Biostatistics',
            'Probability Theory & Stochastic Processes',
            'Mathematical Optimization & Operations Research',
            'Information Theory & Signal Processing',
            'Mathematical Modeling & Numerical Simulation',
            'Mathematical Logic & Set Theory'
        ]
    },
    {
        id: 'engineering-applied',
        name: 'Engineering & Applied Sciences',
        icon: 'bi-gear-wide-connected',
        description: 'Biomedical devices, mechanical aerospace systems, chemical reactors, and nanomaterials.',
        fields: [
            'Engineering (General)',
            'Biomedical & Bioengineering',
            'Chemical & Biomolecular Engineering',
            'Electrical & Electronics Engineering',
            'Mechanical & Aerospace Engineering',
            'Materials Science & Metallurgy',
            'Civil & Structural Engineering',
            'Environmental & Sustainable Engineering',
            'Nuclear & Energy Systems Engineering',
            'Microfluidics & MEMS/NEMS'
        ]
    },
    {
        id: 'cognitive-behavioral',
        name: 'Cognitive, Psychological & Behavioral Sciences',
        icon: 'bi-diagram-3-fill',
        description: 'Cognitive architectures, decision-making, neuropsychology, perception, and psycholinguistics.',
        fields: [
            'Cognitive Science (General)',
            'Cognitive & Experimental Psychology',
            'Neuropsychology & Cognitive Neuroscience',
            'Behavioral Economics & Decision Sciences',
            'Developmental & Educational Psychology',
            'Linguistics & Psycholinguistics',
            'Social & Personality Psychology'
        ]
    },
    {
        id: 'social-sciences',
        name: 'Social Sciences & Economics',
        icon: 'bi-people-fill',
        description: 'Econometrics, political structures, sociological networks, anthropology, and science policy.',
        fields: [
            'Economics & Econometrics (General)',
            'Sociology & Social Network Analysis',
            'Political Science & International Relations',
            'Anthropology & Archaeology',
            'Science & Technology Studies (STS)',
            'Public Policy & Healthcare Economics',
            'Demography & Quantitative Sociology'
        ]
    },
    {
        id: 'interdisciplinary',
        name: 'Interdisciplinary & Emerging Frontiers',
        icon: 'bi-lightbulb-fill',
        description: 'Convergence science, synthetic biofoundries, quantum biology, and planetary habitability.',
        fields: [
            'Synthetic Biology & Biofoundry Engineering',
            'Astrobiology & Origin of Life',
            'Complex Systems Science & Network Dynamics',
            'Neuroengineering & Brain-Machine Interfaces',
            'Renewable Energy, Photovoltaics & Carbon Capture',
            'Quantum Information Science & Quantum Sensing',
            'Precision Agriculture & Agronomy',
            'Computational Social Science & Cultural Analytics'
        ]
    }
];

/**
 * Flat list of all scientific fields across all categories for validation and fast lookups.
 */
export const SCIENTIFIC_FIELDS: string[] = Array.from(
    new Set(SCIENTIFIC_FIELD_CATEGORIES.flatMap(cat => cat.fields))
).sort();

/**
 * Returns the parent category of a given scientific field.
 */
export function getCategoryForField(fieldName: string): ScientificFieldCategory | undefined {
    const trimmed = (fieldName || '').trim().toLowerCase();
    return SCIENTIFIC_FIELD_CATEGORIES.find(cat => 
        cat.fields.some(f => f.toLowerCase() === trimmed || trimmed.includes(f.toLowerCase()))
    );
}

/**
 * Generates an exhaustive field profile including terminology rules, primary literature indices,
 * preferred ontologies, and search keywords tailored to the selected discipline.
 */
export function getFieldProfile(fieldName: string): FieldProfile {
    const rawField = (fieldName || 'Biology').trim();
    const category = getCategoryForField(rawField);
    const catId = category?.id || 'life-sciences';
    const lower = rawField.toLowerCase();

    // Default base templates adapted by category and specialized field keywords
    let primaryDatabases = ['PubMed', 'bioRxiv', 'NCBI', 'CrossRef', 'ScienceDirect'];
    let terminologyGuidelines = 'Use standard Gene Ontology (GO), NCBI Taxonomy, IUPAC nomenclature, and formal biological mechanistic phrasing (e.g. signaling cascades, phenotypic expression, in-vitro assays).';
    let preferredOntologies = ['Gene Ontology (GO)', 'NCBI Taxonomy', 'HGNC Gene Symbols', 'UniProt Knowledgebase'];
    let literatureSearchKeywords = ['pathway', 'mechanism', 'in vitro', 'in vivo', 'expression', 'assay', 'phenotype', 'transcription', 'kinetic'];
    let methodologicalFocus = 'Empirical biological controls (positive/negative), biological vs technical replicates (n >= 3), dose-response validation, and ANOVA/Student t-test with FDR corrections.';
    let sampleQuestions = [
        'Concentration-dependent inhibitory effects of exogenous caffeine on Arabidopsis thaliana root elongation',
        'CRISPR-Cas9 transcriptional repression of oncogenic KRAS G12D in colorectal adenocarcinoma models',
        'Metabolic flux remodeling in Saccharomyces cerevisiae under anaerobic hyperosmotic stress'
    ];

    if (catId === 'medical-sciences' || lower.includes('medic') || lower.includes('oncol') || lower.includes('clini') || lower.includes('cardio') || lower.includes('neuro') && lower.includes('clini')) {
        primaryDatabases = ['PubMed / MEDLINE', 'ClinicalTrials.gov', 'Cochrane Library', 'The Lancet', 'NEJM', 'bioRxiv / medRxiv'];
        terminologyGuidelines = 'Adhere to MeSH (Medical Subject Headings), ICD-11 diagnostic classifications, WHO standardized trial metrics, and formal pharmacodynamic/pharmacokinetic parameters (IC50, AUC, Cmax, hazard ratios).';
        preferredOntologies = ['MeSH (Medical Subject Headings)', 'SNOMED CT', 'Human Phenotype Ontology (HPO)', 'RxNorm'];
        literatureSearchKeywords = ['clinical trial', 'cohort', 'hazard ratio', 'randomized controlled trial', 'biomarker', 'pharmacokinetics', 'efficacy', 'adverse events', 'endpoint'];
        methodologicalFocus = 'Double-blind randomized trials, prospective cohort stratification, Kaplan-Meier survival curves, Cox proportional hazards regression, and ethical institutional review (IRB/GCP).';
        sampleQuestions = [
            'Efficacy of dual PD-1 and CTLA-4 checkpoint blockade in microsatellite-stable metastatic colorectal cancer',
            'Cardiovascular outcome reduction with GLP-1 receptor agonists in non-diabetic metabolic syndrome cohorts',
            'Neuroinflammatory biomarker progression (GFAP & NfL) in early-stage prodromal Alzheimer disease'
        ];
    } else if (catId === 'physical-sciences' || lower.includes('physic') || lower.includes('astron') || lower.includes('quantum') || lower.includes('optics') || lower.includes('plasma')) {
        primaryDatabases = ['arXiv (hep-th, quant-ph, cond-mat, astro-ph)', 'Physical Review Letters (APS)', 'NASA ADS', 'IEEE Xplore', 'Nature Physics'];
        terminologyGuidelines = 'Utilize rigorous mathematical Hamiltonian mechanics, SI unit discipline, tensor calculus notation, standard Dirac bra-ket formalism, and specific symmetry groups (SU(N), SO(3)).';
        preferredOntologies = ['Physics and Astronomy Classification (PACS)', 'IAU Astronomical Thesaurus', 'NIST Physical Constants Registry'];
        literatureSearchKeywords = ['Hamiltonian', 'eigenvalue', 'dispersion relation', 'spectroscopy', 'lattice', 'quantum decoherence', 'scattering amplitude', 'Hubble constant', 'symmetry breaking'];
        methodologicalFocus = 'First-principles analytical derivations, Monte Carlo stochastic integration, 5-sigma statistical discovery thresholds, and high-precision instrument calibration against thermal/quantum noise.';
        sampleQuestions = [
            'Topological edge states and Shubnikov-de Haas oscillations in monolayer graphene under high magnetic field regimes',
            'Gravitational lensing signatures of primordial black holes in James Webb Space Telescope deep-field surveys',
            'Decoherence suppression in superconducting transmon qubits using dynamical decoupling pulse sequences'
        ];
    } else if (catId === 'chemical-sciences' || lower.includes('chem') || lower.includes('cataly') || lower.includes('polymer')) {
        primaryDatabases = ['ACS Publications (JACS, Chem Rev)', 'RSC Publishing', 'ChemRxiv', 'PubChem', 'Cambridge Structural Database (CSD)'];
        terminologyGuidelines = 'Enforce IUPAC systematic chemical nomenclature, SMILES / InChI identifiers, stoichiometry balance, thermodynamic Gibbs free energy notation (ΔG, ΔH, ΔS), and spectroscopic assignments (NMR, FT-IR, MS).';
        preferredOntologies = ['ChEBI (Chemical Entities of Biological Interest)', 'IUPAC Gold Book', 'PubChem Substance ID', 'CAS Registry'];
        literatureSearchKeywords = ['synthesis', 'catalytic turnover (TON/TOF)', 'enantiomeric excess (ee)', 'activation energy', 'reaction mechanism', 'DFT calculation', 'spectroscopic characterization'];
        methodologicalFocus = 'Isolated yield determination, spectroscopic purity verification (>95% by 1H/13C NMR), cyclic voltammetry calibration, and DFT transition-state barrier modeling.';
        sampleQuestions = [
            'Enantioselective organocatalytic C-C bond formation via chiral phosphoric acid catalysis in flow microreactors',
            'High-entropy transition metal phosphide electrocatalysts for alkaline water splitting at ampere-scale current densities',
            'Photoredox-mediated decarboxylative cross-coupling of unactivated aliphatic carboxylic acids with aryl halides'
        ];
    } else if (catId === 'earth-environmental' || lower.includes('climate') || lower.includes('earth') || lower.includes('geol') || lower.includes('ocean')) {
        primaryDatabases = ['GeoRef', 'AGU Publications (JGR, GRL)', 'Copernicus Earth System Sciences', 'NOAA / NASA Earth Data', 'ScienceDirect'];
        terminologyGuidelines = 'Use standard stratigraphy (ICS Chronostratigraphic Chart), IPCC radiative forcing frameworks (W/m²), oceanographic salinity/temperature (TEOS-10), and biogeochemical reservoir notation.';
        preferredOntologies = ['GEMET (General Multilingual Environmental Thesaurus)', 'SWEET Earth Science Ontology', 'ICS Chronostratigraphic Chart'];
        literatureSearchKeywords = ['paleoclimate proxy', 'radiative forcing', 'carbon flux', 'albedo', 'atmospheric circulation', 'sediment core', 'ocean acidification', 'climate sensitivity'];
        methodologicalFocus = 'Spatial temporal kriging, isotope ratio mass spectrometry (δ18O, δ13C calibration), coupled Earth system model ensembles (CMIP6), and instrumental uncertainty bounds.';
        sampleQuestions = [
            'Marine heatwave frequency escalation and benthic ecosystem mortality across the Indo-Pacific warm pool',
            'Permafrost thaw dynamics and nitrous oxide feedback loops in circumpolar sub-Arctic peatlands',
            'High-resolution paleoceanographic reconstructions of the Atlantic Meridional Overturning Circulation during the Younger Dryas'
        ];
    } else if (catId === 'computer-ai' || lower.includes('computer') || lower.includes('artificial intelligence') || lower.includes('machine learning') || lower.includes('deep learning') || lower.includes('cyber') || lower.includes('robot')) {
        primaryDatabases = ['arXiv (cs.AI, cs.LG, cs.CV, cs.CL)', 'IEEE Xplore', 'ACM Digital Library', 'NeurIPS / ICML / ICLR Proceedings', 'Papers With Code'];
        terminologyGuidelines = 'Employ formal computational complexity notations (O(n), NP-completeness), transformer architectural taxonomy (multi-head attention, RoPE), loss formulation (cross-entropy, RLHF PPO), and benchmark metric rigor (BLEU, MMLU, F1, latency, FLOPs).';
        preferredOntologies = ['ACM Computing Classification System (CCS)', 'IEEE Standard Glossary', 'Hugging Face Task Taxonomy'];
        literatureSearchKeywords = ['state-of-the-art', 'ablation study', 'transformer', 'benchmark', 'latency', 'convergence rate', 'generalization bound', 'reinforcement learning', 'inference'];
        methodologicalFocus = 'Ablation study matrices, multiple independent random seeds (n >= 5) with standard error reporting, baseline state-of-the-art comparisons, and compute budget (GPU-hours/FLOPs) transparency.';
        sampleQuestions = [
            'Sparse mixture-of-experts routing stability and memory bandwidth efficiency on consumer GPU clusters',
            'Formal verification of safety invariants in reinforcement learning agents operating autonomous drone swarms',
            'Differential privacy mechanisms for decentralized federated learning with Byzantine fault tolerance'
        ];
    } else if (catId === 'mathematical-sciences' || lower.includes('math') || lower.includes('statistic')) {
        primaryDatabases = ['arXiv (math.PR, math.ST, math.AP)', 'MathSciNet / AMS', 'Annals of Mathematics', 'JSTOR', 'Project Euclid'];
        terminologyGuidelines = 'Strict axiomatic definition-theorem-proof structure, standard epsilon-delta real analysis limits, measure theory notation (Lp spaces, sigma-algebras), and asymptotic notations.';
        preferredOntologies = ['Mathematics Subject Classification (MSC2020)', 'AMS Glossary of Mathematical Terms'];
        literatureSearchKeywords = ['lemma', 'theorem', 'asymptotic normality', 'ergodic', 'manifold', 'spectral gap', 'martingale', 'Lipschitz continuous', 'convergence in distribution'];
        methodologicalFocus = 'Rigorous deductive proofs, counterexample construction, Markov Chain Monte Carlo mixing diagnostics, and minimax risk bounds.';
        sampleQuestions = [
            'Optimal transport distances and convergence rates of empirical measures on high-dimensional Riemannian manifolds',
            'Spectral properties and eigenvalue distribution of heavy-tailed random adjacency matrices',
            'Non-asymptotic bounds for high-dimensional sparse covariance estimation under sub-Gaussian noise'
        ];
    } else if (catId === 'engineering-applied' || lower.includes('engineer') || lower.includes('materials')) {
        primaryDatabases = ['IEEE Xplore', 'ASME Digital Collection', 'ScienceDirect (Acta Materialia)', 'Materials Today', 'Springer Engineering'];
        terminologyGuidelines = 'Technical engineering metrics (Young modulus, tensile yield strength in MPa, Reynolds number, finite element mesh parameters, ISO/ASTM test standards).';
        preferredOntologies = ['Engineering Index Thesaurus', 'ASTM International Standards Directory', 'ISO Technical Subject Index'];
        literatureSearchKeywords = ['finite element analysis (FEA)', 'tensile strength', 'fatigue life', 'tribology', 'thermal conductivity', 'efficiency', 'fluid dynamics', 'tolerance'];
        methodologicalFocus = 'ASTM/ISO standard test specimens, finite element convergence verification, safety factor margins, and design-of-experiments (Taguchi orthogonal arrays).';
        sampleQuestions = [
            'Mechanical degradation and fatigue crack propagation in laser powder bed fusion Ti-6Al-4V aerospace components',
            'Microfluidic droplet generator optimization for high-throughput single-cell encapsulation via acoustic streaming',
            'Thermoelectric figure-of-merit (zT) enhancement in nanostructured bismuth telluride composite thin films'
        ];
    } else if (catId === 'cognitive-behavioral' || lower.includes('psychol') || lower.includes('cognit')) {
        primaryDatabases = ['PsycINFO (APA)', 'PubMed', 'Cognition (Elsevier)', 'Trends in Cognitive Sciences', 'Frontiers in Psychology'];
        terminologyGuidelines = 'APA 7th edition nomenclature, reaction time / accuracy metrics, cognitive load paradigms, signal detection theory (d-prime, criterion), and psychometric scale validity indices (Cronbach alpha).';
        preferredOntologies = ['APA Thesaurus of Psychological Index Terms', 'Cognitive Atlas Ontology', 'Neuroimaging Data Model (NIDM)'];
        literatureSearchKeywords = ['working memory', 'reaction time', 'fMRI', 'executive function', 'effect size (Cohen d)', 'cognitive bias', 'psychometric', 'ecological validity'];
        methodologicalFocus = 'Preregistration of hypotheses (OSF), counterbalanced within-subject stimulus presentations, power calculations (1-beta >= 0.80), and hierarchical linear mixed models (HLM).';
        sampleQuestions = [
            'Working memory capacity depletion and cognitive cognitive reframing under acute physiological sleep deprivation',
            'Neural correlates of perceptual decision confidence during ambiguous sensory evidence accumulation',
            'Ecological momentary assessment of affective switching dynamics in high-stress clinical healthcare workers'
        ];
    } else if (catId === 'social-sciences' || lower.includes('econom') || lower.includes('socio') || lower.includes('politi')) {
        primaryDatabases = ['SSRN (Social Science Research Network)', 'NBER Working Papers', 'JSTOR', 'American Economic Review', 'Web of Science'];
        terminologyGuidelines = 'Econometric identification strategies (Difference-in-Differences, Instrumental Variables, Regression Discontinuity), statistical significance conventions, and demographic socioeconomic indices.';
        preferredOntologies = ['JEL Classification System (Journal of Economic Literature)', 'UNESCO Social Sciences Thesaurus'];
        literatureSearchKeywords = ['econometric', 'instrumental variable', 'causal inference', 'difference-in-differences', 'socioeconomic', 'longitudinal', 'policy evaluation', 'fixed effects'];
        methodologicalFocus = 'Quasi-experimental causal identification, parallel trends assumption verification, clustered standard errors, and robustness checks against omitted variable bias.';
        sampleQuestions = [
            'Labor market polarization and wage wage elasticity following generative AI deployment across OECD financial sectors',
            'Causal impacts of municipal universal childcare subsidies on maternal workforce re-entry: A staggered DiD analysis',
            'Social network diffusion of scientific consensus regarding climate mitigation interventions on digital platforms'
        ];
    }

    return {
        field: rawField,
        name: rawField,
        category: category?.name || 'General Science',
        primaryDatabases,
        terminologyGuidelines,
        preferredOntologies,
        literatureSearchKeywords,
        methodologicalFocus,
        sampleQuestions
    };
}

/**
 * Builds a search query modifier string for academic search engines grounded in the selected field.
 */
export function buildFieldSearchQueryDirective(field: string, topic: string): string {
    const profile = getFieldProfile(field);
    const keywords = profile.literatureSearchKeywords.slice(0, 4).join(' OR ');
    return `"${topic}" (${keywords}) source:(${profile.primaryDatabases.slice(0, 3).join(' OR ')})`;
}
