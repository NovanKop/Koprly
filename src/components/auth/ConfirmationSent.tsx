import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface ConfirmationSentProps {
    email: string;
    onBack: () => void;
}

export function ConfirmationSent({ email, onBack }: ConfirmationSentProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center p-6"
        >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
                <Mail size={40} />
            </div>

            <h3 className="text-2xl font-bold text-text-primary mb-3">
                Check Your Email
            </h3>

            <p className="text-text-secondary leading-relaxed mb-8">
                We've sent a verification link to <br />
                <span className="font-semibold text-text-primary">{email}</span>.
                <br /><br />
                Please verify your email to unlock all features of Koprly.
            </p>

            <div className="w-full space-y-4">
                <Button
                    onClick={() => window.open('https://mail.google.com', '_blank')}
                    className="w-full relative overflow-hidden group"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        Open Gmail <Mail size={16} />
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                </Button>

                <button
                    onClick={onBack}
                    className="flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors w-full py-2"
                >
                    <ArrowLeft size={16} />
                    Back to Login
                </button>
            </div>
        </motion.div>
    );
}
