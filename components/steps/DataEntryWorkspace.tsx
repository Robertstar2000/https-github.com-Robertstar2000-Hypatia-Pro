import React, { useState, useRef } from 'react';
import { useToast } from '../../toast';

export const DataEntryWorkspace = ({ experiment, onComplete }: { experiment: any, onComplete: (data: any) => void }) => {
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>(['Variable1', 'Variable2', 'Result']); // Default
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const downloadTemplate = async () => {
        try {
            addToast("Loading Excel tools...", "info");
            const XLSXModule = await import('xlsx');
            const Lib = XLSXModule.default || XLSXModule;
            const ws = Lib.utils.aoa_to_sheet([headers, ...data.map(d => headers.map(h => d[h] || ''))]);
            const wb = Lib.utils.book_new();
            Lib.utils.book_append_sheet(wb, ws, "DataTemplate");
            Lib.writeFile(wb, `${experiment.title.replace(/\s+/g, '_')}_template.xlsx`);
        } catch (error) {
            console.error(error);
            addToast("Failed to download template.", "danger");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                addToast("Loading Excel parsing engine...", "info");
                const XLSXModule = await import('xlsx');
                const Lib = XLSXModule.default || XLSXModule;
                const bstr = evt.target?.result;
                const wb = Lib.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = Lib.utils.sheet_to_json(ws);
                setData(jsonData);
                if (jsonData.length > 0) {
                    setHeaders(Object.keys(jsonData[0] as object));
                }
                addToast("Data uploaded successfully!", "success");
            } catch (error) {
                console.error(error);
                addToast("Failed to parse the uploaded file.", "danger");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleRowChange = (index: number, key: string, value: any) => {
        const newData = [...data];
        newData[index][key] = value;
        setData(newData);
    };

    const addRow = () => {
        setData([...data, {}]);
    };

    return (
        <div className="card bg-dark text-white p-4">
            <h3>Data Entry</h3>
            <div className="d-flex gap-2 mb-4">
                <button className="btn btn-outline-primary" onClick={downloadTemplate}>Download Template</button>
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Upload Filled Spreadsheet</button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
            </div>

            <div className="table-responsive">
                <table className="table table-dark table-bordered">
                    <thead>
                        <tr>
                            {headers.map(h => <th key={h}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {headers.map(h => (
                                    <td key={h}>
                                        <input className="form-control bg-dark text-white" value={row[h] || ''} onChange={(e) => handleRowChange(i, h, e.target.value)} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button className="btn btn-outline-secondary mt-2" onClick={addRow}>+ Add Row</button>
            <div className="mt-4">
                <button className="btn btn-success" onClick={() => onComplete(data)}>Complete Data Entry & Continue</button>
            </div>
        </div>
    );
};
