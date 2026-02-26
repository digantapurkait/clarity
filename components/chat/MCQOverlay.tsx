'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface MCQProps {
    question: string;
    options: string[];
    onSelect: (option: string) => void;
    onClose: () => void;
}

export default function MCQOverlay({ question, options, onSelect, onClose }: MCQProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const handleSelect = (option: string) => {
        setSelected(option);
        setTimeout(() => {
            onSelect(option);
            onClose();
        }, 600);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[rgba(var(--bg-deep-rgb),0.9)] backdrop-blur-2xl"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="max-w-xl w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[40px] p-10 shadow-3xl relative overflow-hidden group"
                >
                    {/* Background glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)] opacity-[0.08] blur-[80px] rounded-full" />

                    <div className="relative z-10 space-y-8">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest">
                                Pattern Verification
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                                {question}
                            </h2>
                        </div>

                        <div className="grid gap-4">
                            {options.map((option, idx) => (
                                <motion.button
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect(option)}
                                    className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between group/opt ${selected === option
                                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_10px_30px_rgba(var(--accent-rgb),0.3)]'
                                            : 'bg-white/5 border-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    <span className="text-sm sm:text-base font-medium leading-relaxed">
                                        {option}
                                    </span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected === option ? 'border-white bg-white/20' : 'border-white/10'
                                        }`}>
                                        {selected === option && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-bold"
                        >
                            I'd rather keep talking first
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
