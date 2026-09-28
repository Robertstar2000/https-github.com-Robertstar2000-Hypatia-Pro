import React, { useState, useEffect } from 'react';

interface VoiceDictationButtonProps {
    onSpeechResult: (text: string) => void;
    className?: string;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
    onSpeechResult,
    className = "btn btn-xs btn-outline-secondary"
}) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        const windowObj = window as any;
        const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsSupported(true);
        }
    }, []);

    const toggleDictation = () => {
        const windowObj = window as any;
        const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Web Speech API is not supported in this browser environment. Try Chrome, Edge, or Safari.');
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    onSpeechResult(transcript);
                }
                setIsListening(false);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        } catch (e) {
            console.error('Speech recognition error:', e);
            setIsListening(false);
        }
    };

    if (!isSupported) return null;

    return (
        <button
            type="button"
            className={`${className} ${isListening ? 'btn-danger animate-pulse text-white' : ''}`}
            onClick={toggleDictation}
            title={isListening ? 'Listening... Speak now' : 'Dictate feedback or notes via Web Speech API'}
        >
            <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'} me-1`}></i>
            {isListening ? 'Listening...' : 'Dictate'}
        </button>
    );
};
