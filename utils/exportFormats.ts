import { Experiment } from '../config';

/**
 * Generates IEEE Conference / Journal LaTeX Source Code
 */
export function generateIeeeLatex(experiment: Experiment, manuscriptText: any): string {
    const title = experiment?.title || "Research Investigation";
    const authors = "Project Hypatia Research Lab";
    const rawAbstract = experiment?.stepData?.[10]?.summary || experiment?.description || "Abstract not provided.";
    const abstract = typeof rawAbstract === 'string' ? rawAbstract : JSON.stringify(rawAbstract);
    const textStr = typeof manuscriptText === 'string' ? manuscriptText : JSON.stringify(manuscriptText || '');

    return `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\begin{document}

\\title{${title}}

\\author{\\IEEEauthorblockN{${authors}}
\\IEEEauthorblockA{\\textit{Department of Computational Science} \\\\
\\textit{Hypatia Autonomous Discovery System}\\\\
Date: ${new Date().toLocaleDateString()}}}

\\maketitle

\\begin{abstract}
${abstract.replace(/[%$#&_{}~^]/g, '\\$&')}
\\end{abstract}

\\begin{IEEEkeywords}
computational science, automated hypothesis, empirical data analysis
\\end{IEEEkeywords}

\\section{Introduction}
${textStr ? textStr.slice(0, 1500).replace(/[%$#&_{}~^]/g, '\\$&') : 'Detailed manuscript body...'}

\\section{Methodology \\& Experimental Setup}
The experimental methodology followed a systematic 10-step autonomous protocol, generating verifiable datasets and statistical evaluations.

\\section{Conclusion}
This study demonstrates structured computational exploration using automated AI agent pipelines.

\\end{document}
`;
}

/**
 * Generates Nature Journal LaTeX Source Code
 */
export function generateNatureLatex(experiment: Experiment, manuscriptText: any): string {
    const title = experiment?.title || "Research Discovery";
    const rawAbstract = experiment?.stepData?.[10]?.summary || "Abstract";
    const abstract = typeof rawAbstract === 'string' ? rawAbstract : JSON.stringify(rawAbstract);
    const textStr = typeof manuscriptText === 'string' ? manuscriptText : JSON.stringify(manuscriptText || '');

    return `\\documentclass{nature}
\\usepackage{graphicx}
\\usepackage{amsmath}

\\title{${title}}
\\author{Hypatia Discovery Group}

\\begin{document}

\\maketitle

\\begin{addendum}
 \\item[Abstract] ${abstract.replace(/[%$#&_{}~^]/g, '\\$&')}
\\end{addendum}

\\section*{Main Text}
${textStr ? textStr.slice(0, 2000).replace(/[%$#&_{}~^]/g, '\\$&') : 'Main paper content...'}

\\end{document}
`;
}

/**
 * Generates APA 7th Edition Markdown Document
 */
export function generateApa7Markdown(experiment: Experiment, manuscriptText: any): string {
    const rawAbstract = experiment?.stepData?.[10]?.summary || experiment?.description || "Abstract summary";
    const abstract = typeof rawAbstract === 'string' ? rawAbstract : JSON.stringify(rawAbstract);
    const textStr = typeof manuscriptText === 'string' ? manuscriptText : JSON.stringify(manuscriptText || '');

    return `# ${experiment?.title || "Research Paper"}

**Author:** Project Hypatia Research Lab  
**Affiliation:** Autonomous Scientific Discovery  
**Date:** ${new Date().toLocaleDateString()}  

---

## Abstract
${abstract}

*Keywords:* research, empirical data, automated discovery, statistics

---

## Introduction
${textStr}

---
*Formatted according to APA 7th Edition Guidelines.*
`;
}

/**
 * Generates BibTeX File (.bib) for citations
 */
export function generateBibtexCitations(experiment: Experiment): string {
    const citations = experiment?.citations || [];
    if (citations.length === 0) {
        return `@article{hypatia2026,
  title={${experiment?.title || 'Automated Research Paper'}},
  author={Hypatia Lab},
  journal={Journal of Autonomous Discovery},
  year={2026}
}`;
    }

    return citations.map((c, i) => {
        const key = `ref_${c.year || '2026'}_${i + 1}`;
        return `@article{${key},
  title={${c.title || 'Untitled Reference'}},
  author={${c.authors || 'Unknown'}},
  year={${c.year || '2026'}},
  url={${c.url || ''}},
  note={${c.notes || ''}}
}`;
    }).join('\n\n');
}

/**
 * Triggers browser download for arbitrary text files
 */
export function downloadTextFile(filename: string, content: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
