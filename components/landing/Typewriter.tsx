'use client';

import { useState, useEffect } from 'react';

interface TypewriterProps {
    phrases: string[];
    typingSpeed?: number;
    erasingSpeed?: number;
    pauseDuration?: number;
}

export default function Typewriter({
    phrases,
    typingSpeed = 60,
    erasingSpeed = 30,
    pauseDuration = 2000,
}: TypewriterProps) {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [currentText, setCurrentText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const activePhrase = phrases[currentPhraseIndex];
        let timer: NodeJS.Timeout;

        if (isDeleting) {
            if (currentText === '') {
                setIsDeleting(false);
                setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
            } else {
                timer = setTimeout(() => {
                    setCurrentText(currentText.slice(0, -1));
                }, erasingSpeed);
            }
        } else {
            if (currentText === activePhrase) {
                timer = setTimeout(() => {
                    setIsDeleting(true);
                }, pauseDuration);
            } else {
                timer = setTimeout(() => {
                    setCurrentText(activePhrase.slice(0, currentText.length + 1));
                }, typingSpeed);
            }
        }

        return () => clearTimeout(timer);
    }, [currentText, isDeleting, currentPhraseIndex, phrases, typingSpeed, erasingSpeed, pauseDuration]);

    return (
        <span className="typewriter-container">
            {currentText}
            <span className="typewriter-cursor">|</span>
        </span>
    );
}
