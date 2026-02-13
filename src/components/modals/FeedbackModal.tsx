import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, CheckCircle2, MessageSquare, Bug, Lightbulb, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FeedbackCategory = 'Bug' | 'Feature Request' | 'UI/UX Improvement' | 'Other';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: any; color: string }[] = [
    { id: 'Bug', label: 'Report a Bug', icon: Bug, color: 'text-red-400' },
    { id: 'Feature Request', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
    { id: 'UI/UX Improvement', label: 'UI/UX Feedback', icon: Sparkles, color: 'text-purple-400' },
    { id: 'Other', label: 'Other', icon: MessageSquare, color: 'text-blue-400' },
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [category, setCategory] = useState<FeedbackCategory | null>(null);
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        if (!category || !message.trim()) return;

        setIsSubmitting(true);
        try {
            await api.submitFeedback({
                category,
                message,
                attachment: attachment || undefined,
            });
            setStep('success');
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep('form');
        setCategory(null);
        setMessage('');
        setAttachment(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white dark:bg-[#141414] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]"
                        style={{
                            boxShadow: '0 0 40px rgba(0,0,0,0.2)',
                            background: 'rgba(255, 255, 255, 0.98)', // Opaque Light Mode
                        }}
                    >
                        <div className="dark:bg-[#141414]/98 w-full h-full flex flex-col">
                            {/* Header */}
                            <div className="p-6 pb-2 flex items-center justify-between shrink-0">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                                    {step === 'form' ? 'Share Your Thoughts' : 'Thank You!'}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 pt-2 overflow-y-auto flex-1">
                                <AnimatePresence mode="wait">
                                    {step === 'form' ? (
                                        <motion.div
                                            key="form"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            {/* Categories */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setCategory(cat.id)}
                                                        className={`
                                                            p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 text-center relative overflow-hidden group
                                                            ${category === cat.id
                                                                ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                                                                : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                                        `}
                                                    >
                                                        <cat.icon size={24} className={category === cat.id ? 'text-primary' : 'text-gray-400 dark:text-gray-500 group-hover:scale-110 transition-transform'} />
                                                        <span className="text-sm font-medium">{cat.label}</span>
                                                        {category === cat.id && (
                                                            <motion.div
                                                                layoutId="active-indicator"
                                                                className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none"
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Message Input */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                                                    Details
                                                </label>
                                                <textarea
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    placeholder="Tell us more about it..."
                                                    className="w-full min-h-[120px] p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/50 focus:bg-white dark:focus:bg-black/20 focus:ring-4 focus:ring-primary/10 transition-all resize-none text-base outline-none dark:text-white placeholder:text-gray-400"
                                                />
                                            </div>

                                            {/* Attachment */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 block mb-2">
                                                    Attachment (Optional)
                                                </label>
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-3 group"
                                                >
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                                        accept="image/png, image/jpeg"
                                                        className="hidden"
                                                    />
                                                    {attachment ? (
                                                        <>
                                                            <ImageIcon size={20} className="text-primary" />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">
                                                                {attachment.name}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAttachment(null);
                                                                }}
                                                                className="p-1 rounded-full bg-gray-200 dark:bg-white/20 hover:bg-red-500 hover:text-white transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                                                            <span className="text-sm text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                                                Upload Screenshot (JPG, PNG)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            <Button
                                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={handleSubmit}
                                                disabled={!category || !message.trim() || isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="animate-spin" />
                                                        <span>Sending...</span>
                                                    </div>
                                                ) : (
                                                    'Send Feedback'
                                                )}
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-8 text-center"
                                        >
                                            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-6">
                                                <CheckCircle2 size={48} className="text-green-500" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                                Got it!
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
                                                Your feedback helps us build a better Koprly. Thank you for your contribution!
                                            </p>

                                            <div className="w-full space-y-3">
                                                <Button
                                                    className="w-full h-12 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 border-none font-medium"
                                                    onClick={handleReset}
                                                >
                                                    Submit Another
                                                </Button>
                                                <Button
                                                    className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
                                                    onClick={handleClose}
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
