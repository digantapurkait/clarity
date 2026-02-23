
'use client';

import { useState, useEffect } from 'react';

interface SequenceItem {
    type: 'type' | 'pause' | 'erase' | 'boom';
    text?: string;
    duration?: number;
}

const SEQUENCE: SequenceItem[] = [
    { type: 'type', text: "You’ve been trying to fix symptoms…" },
    { type: 'pause', duration: 1000 },
    { type: 'type', text: "but the real structure stayed invisible." },
    { type: 'pause', duration: 2000 },
    { type: 'erase' },
    { type: 'type', text: "You don’t feel stuck randomly." },
    { type: 'pause', duration: 800 },
    { type: 'type', text: "You repeat invisible patterns." },
    { type: 'pause', duration: 2000 },
    { type: 'erase' },
    { type: 'type', text: "Nothing changes…" },
    { type: 'pause', duration: 1000 },
    { type: 'type', text: "until you see what’s been repeating." },
    { type: 'pause', duration: 2000 },
    { type: 'erase' },
    { type: 'type', text: "You’re not stuck. You’re repeating a pattern you haven’t seen yet." },
    { type: 'pause', duration: 1500 },
    { type: 'boom', text: "--UNTIL NOW" },
    { type: 'pause', duration: 3000 },
    { type: 'erase' },
];

export default function Typeflow() {
    const [index, setIndex] = useState(0);
    const [display, setDisplay] = useState('');
    const [isBoom, setIsBoom] = useState(false);

    useEffect(() => {
        const item = SEQUENCE[index];
        let timer: NodeJS.Timeout;

        if (item.type === 'type') {
            const target = item.text || '';
            if (display.length < target.length) {
                timer = setTimeout(() => {
                    setDisplay(target.slice(0, display.length + 1));
                }, 40);
            } else {
                setIndex((prev) => (prev + 1) % SEQUENCE.length);
            }
        } else if (item.type === 'pause') {
            timer = setTimeout(() => {
                setIndex((prev) => (prev + 1) % SEQUENCE.length);
            }, item.duration || 1000);
        } else if (item.type === 'erase') {
            if (display.length > 0) {
                timer = setTimeout(() => {
                    setDisplay(display.slice(0, -1));
                }, 20);
            } else {
                setIndex((prev) => (prev + 1) % SEQUENCE.length);
            }
        } else if (item.type === 'boom') {
            setIsBoom(true);
            setDisplay(display + (item.text || ''));
            timer = setTimeout(() => {
                setIsBoom(false);
                setIndex((prev) => (prev + 1) % SEQUENCE.length);
            }, 1000);
        }

        return () => clearTimeout(timer);
    }, [index, display]);

    return (
        <div className="min-h-[4rem] text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto mb-12 flex flex-col items-center justify-center text-center">
            <p className={`${isBoom ? 'text-[var(--accent)] font-bold scale-110 transition-all duration-300' : ''}`}>
                {display}
                <span className="typewriter-cursor">|</span>
            </p>
        </div>
    );
}
