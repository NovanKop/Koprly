import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen w-full bg-background text-text-primary overflow-x-hidden selection:bg-primary/20 selection:text-primary">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-secondary/10 blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-success/5 blur-[100px] animate-blob animation-delay-4000" />
            </div>

            <main className="container mx-auto px-4 py-6 pb-24 max-w-2xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
