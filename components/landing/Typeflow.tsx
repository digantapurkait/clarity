
'use client';

import { useState, useEffect } from 'react';

interface SequenceItem {
    type: 'type' | 'pause' | 'erase';
    text?: string;
    duration?: number;
}

const SEQUENCE: SequenceItem[] = [
    { type: 'type', text: "MindMantra doesn't give advice. It listens, remembers, and reflects — until you start to see yourself more clearly." },
    { type: 'pause', duration: 3000 },
    { type: 'erase' },
    { type: 'type', text: "Talk for 2 minutes. Leave with clarity." },
    { type: 'pause', duration: 4000 },
    { type: 'erase' },
];

export default function Typeflow() {
    const [index, setIndex] = useState(0);
    const [display, setDisplay] = useState('');

    useEffect(() => {
        const item = SEQUENCE[index];
        let timer: NodeJS.Timeout;

        if (item.type === 'type') {
            const target = item.text || '';
            if (display.length < target.length) {
                timer = setTimeout(() => {
                    setDisplay(target.slice(0, display.length + 1));
                }, 45);
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
                }, 25);
            } else {
                setIndex((prev) => (prev + 1) % SEQUENCE.length);
            }
        }

        return () => clearTimeout(timer);
    }, [index, display]);

    return (
        <div className="min-h-[4rem] text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto mb-12 flex flex-col items-center justify-center text-center">
            <p>
                {display}
                <span className="typewriter-cursor">|</span>
            </p>
        </div>
    );
}
