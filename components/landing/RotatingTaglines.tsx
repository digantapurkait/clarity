
'use client';

import { useState, useEffect } from 'react';

const TAGLINES = [
    "You’ve been trying to fix symptoms instead of seeing the underlying structure.",
    "You don’t feel stuck randomly. You repeat invisible patterns — until you see them.",
    "The earlier you see your pattern, the easier life becomes.",
    "Nothing changes until you see the pattern you’ve been living inside. --UNTIL NOW"
];

export default function RotatingTaglines() {
    const [index, setIndex] = useState(0);
    const [display, setDisplay] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const active = TAGLINES[index];
        let timer: NodeJS.Timeout;

        if (isDeleting) {
            if (display.length > 0) {
                timer = setTimeout(() => {
                    setDisplay(display.slice(0, -1));
                }, 30);
            } else {
                setIsDeleting(false);
                setIndex((prev) => (prev + 1) % TAGLINES.length);
            }
        } else {
            if (display.length < active.length) {
                timer = setTimeout(() => {
                    setDisplay(active.slice(0, display.length + 1));
                }, 60);
            } else {
                timer = setTimeout(() => {
                    setIsDeleting(true);
                }, 3000);
            }
        }

        return () => clearTimeout(timer);
    }, [index, display, isDeleting]);

    return (
        <div className="h-12 flex items-center justify-center text-[var(--accent)] font-medium text-lg italic opacity-90 transition-all duration-500">
            <p>
                {display}
                <span className="typewriter-cursor">|</span>
            </p>
        </div>
    );
}
