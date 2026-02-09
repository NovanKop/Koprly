import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

import { AppLayout } from '../layouts/AppLayout';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Plus, Pencil, Camera, Image as ImageIcon, Calendar, Wallet, Target, Check, Sparkles, Sun, Moon, CreditCard, LogOut, ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatIDR, parseIDR } from '../utils/currencyFormatter';
import { WALLET_ICONS, WALLET_COLORS } from '../lib/constants';
import { ProgressBarGlow } from '../components/glass/ProgressBarGlow';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { GlassCard } from '../components/glass/GlassCard';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { type Category } from '../types';

interface InitialWallet {
    name: string;
    type: string;
    balance: string;
    color?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat-groceries', name: 'Groceries', icon: '🛒', color: '#34C759', monthly_budget: 0 },
    { id: 'cat-housing', name: 'Housing', icon: '🏠', color: '#5856D6', monthly_budget: 0 },
    { id: 'cat-transport', name: 'Transportation', icon: '🚗', color: '#007AFF', monthly_budget: 0 },
    { id: 'cat-dining', name: 'Dining Out', icon: '🍽️', color: '#FF9500', monthly_budget: 0 },
    { id: 'cat-entertainment', name: 'Entertainment', icon: '🎬', color: '#FF2D55', monthly_budget: 0 },
    { id: 'cat-healthcare', name: 'Healthcare', icon: '🏥', color: '#FF3B30', monthly_budget: 0 },
    { id: 'cat-shopping', name: 'Shopping', icon: '👕', color: '#AF52DE', monthly_budget: 0 },
    { id: 'cat-other', name: 'Other', icon: '💼', color: '#8E8E93', monthly_budget: 0 },
];

const FINANCIAL_RECOMMENDATION: Record<string, number> = {
    'Groceries': 0.20,
    'Housing': 0.25,
    'Transportation': 0.10,
    'Healthcare': 0.05,
    'Dining Out': 0.10,
    'Entertainment': 0.10,
    'Shopping': 0.10,
    'Other': 0.10,
};

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
    const { user, signOut } = useAuth();
    const { currency, theme, setTheme } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [step, setStep] = useState(1); // 1: Identity, 2: Wallets, 3: Budget, 4: Date, 5: Summary

    // Profile Picture State
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Step 2: Wallets
    const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);
    const [activeWalletIndex, setActiveWalletIndex] = useState(0);
    const [wallets, setWallets] = useState<InitialWallet[]>([
        { name: 'Main Bank', type: 'bank', balance: '', color: WALLET_COLORS[0] },
    ]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState<number | null>(null);

    // Step 3: Spending Limit & Categories
    const [spendingLimit, setSpendingLimit] = useState('');
    const [budgetPercentage, setBudgetPercentage] = useState(70);
    const [onboardingCategories, setOnboardingCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [isAutoAllocated, setIsAutoAllocated] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Step 4: Budget Period Date Picker
    const [periodType] = useState<'monthly' | 'weekly' | 'rolling'>('monthly');
    const [resetDay, setResetDay] = useState<number>(1); // 1-31, -1 for Last Day

    const [showSuccess, setShowSuccess] = useState(false);

    // Handlers for local category management
    const handleLocalSave = async (categoryData: Partial<Category>) => {
        if (categoryData.id) {
            // Edit existing
            setOnboardingCategories(prev => prev.map(c =>
                c.id === categoryData.id ? { ...c, ...categoryData } as Category : c
            ));
        } else {
            // Add new
            const newCategory: Category = {
                id: `cat-${Date.now()}`,
                name: categoryData.name || '',
                icon: categoryData.icon || '💼',
                color: categoryData.color || '#8E8E93',
                monthly_budget: categoryData.monthly_budget || 0,
            };
            setOnboardingCategories(prev => [...prev, newCategory]);
        }
        setIsAutoAllocated(false);
    };

    const handleLocalDelete = async (categoryId: string) => {
        setOnboardingCategories(prev => prev.filter(c => c.id !== categoryId));
        setIsAutoAllocated(false);
    };

    // Calculate total wealth from wallets
    const totalWealth = wallets.reduce((sum, w) => sum + (parseIDR(w.balance) || 0), 0);

    // Currency symbol
    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    // Extract initial from name or email
    const initial = name ? name[0].toUpperCase() : (user?.email?.[0].toUpperCase() || 'U');

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
                return;
            }
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        setShowPhotoOptions(false);
    };

    // Navigation
    const handleNext = () => {
        if (step < 5) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    // Wallet management
    const addWallet = () => {
        if (wallets.length >= 4) return;
        setWallets([...wallets, {
            name: `Wallet ${wallets.length + 1}`,
            type: 'card',
            balance: '',
            color: WALLET_COLORS[wallets.length % WALLET_COLORS.length]
        }]);
        setActiveWalletIndex(wallets.length);
    };

    const removeWallet = (index: number) => {
        if (wallets.length > 1) {
            setWallets(wallets.filter((_, i) => i !== index));
            if (activeWalletIndex >= index && activeWalletIndex > 0) {
                setActiveWalletIndex(prev => prev - 1);
            }
        }
        setShowDeleteConfirm(false);
        setWalletToDelete(null);
    };

    const updateWallet = (index: number, field: keyof InitialWallet, value: string) => {
        const newWallets = [...wallets];
        // @ts-ignore
        newWallets[index] = { ...newWallets[index], [field]: value };
        setWallets(newWallets);
    };

    // Apply suggestion
    const applySuggestion = (percent: number) => {
        setBudgetPercentage(percent);
        const amount = Math.floor(totalWealth * (percent / 100));
        setSpendingLimit(formatIDR(amount));

        // Update categories if auto-allocation is on
        if (isAutoAllocated) {
            const updatedCats = onboardingCategories.map(cat => ({
                ...cat,
                monthly_budget: Math.floor(amount * (FINANCIAL_RECOMMENDATION[cat.name] || 0))
            }));
            setOnboardingCategories(updatedCats as Category[]);
        }
    };

    // Auto-allocation toggle
    const toggleAutoAllocation = (active: boolean) => {
        setIsAutoAllocated(active);
        const limit = parseIDR(spendingLimit);

        const updatedCats = onboardingCategories.map(cat => ({
            ...cat,
            monthly_budget: active
                ? Math.floor(limit * (FINANCIAL_RECOMMENDATION[cat.name] || 0))
                : 0
        }));
        setOnboardingCategories(updatedCats as Category[]);
    };

    // Update single category budget
    // const updateCategoryBudget = (index: number, value: string) => {
    //     const cleaned = value.replace(/[^0-9]/g, '');
    //     const updatedCats = [...onboardingCategories];
    //     updatedCats[index] = {
    //         ...updatedCats[index],
    //     //     monthly_budget: cleaned ? parseInt(cleaned) : 0
    //     };
    //     setOnboardingCategories(updatedCats);
    //     // Turn off auto-allocate if user manually edits
    //     if (isAutoAllocated) setIsAutoAllocated(false);
    // };

    // Final submission
    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Upload profile picture if selected
            let profilePictureUrl: string | undefined;
            if (profilePictureFile) {
                profilePictureUrl = await api.uploadProfilePicture(profilePictureFile);
            }

            // 2. Update Profile with spending_limit (stored in total_budget for now)
            // Note: Using existing fields until database is migrated
            await api.updateProfile({
                username: name,
                total_budget: parseIDR(spendingLimit), // Store spending limit in total_budget
                theme: theme, // Save user's theme preference
                reset_day: resetDay,
                ...(profilePictureUrl && { profile_picture: profilePictureUrl })
            });

            // 3. Create Wallets
            for (const w of wallets) {
                if (w.name && w.balance) {
                    await api.createWallet({
                        user_id: user.id,
                        name: w.name,
                        type: w.type,
                        balance: parseIDR(w.balance),
                        color: w.color || '#007AFF'
                    });
                }
            }

            // 4. Create Default Categories with custom budgets
            for (const cat of onboardingCategories) {
                await api.createCategory({
                    user_id: user.id,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    monthly_budget: cat.monthly_budget
                });
            }

            // 5. Show success animation
            setShowSuccess(true);

            // Fire confetti
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#34C759', '#32ADE6', '#FFCC00', '#FF9500'],
                disableForReducedMotion: true,
            });

            // Redirect after animation
            setTimeout(() => {
                onComplete();
            }, 2000);

        } catch (error) {
            console.error('Failed to setup profile:', error);
            alert('Failed to save profile. Please try again.');
            setLoading(false);
        }
    };

    // Validation
    const isStep1Valid = name.trim().length >= 2;
    const isStep2Valid = wallets.length >= 1 && wallets.every(w => w.name && w.balance);
    const isStep3Valid = parseIDR(spendingLimit) > 0;
    const isStep4Valid = true; // Date is always valid with default value 1

    // Success overlay
    if (showSuccess) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', duration: 0.6 }}
                        className="text-center"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.5)]"
                        >
                            <Check size={48} className="text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-bold mb-2">You're All Set! 🎉</h1>
                        <p className="text-gray-400">Welcome to Koprly. Let's start tracking!</p>
                    </motion.div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 relative">
                {/* Back to Login (Sign Out) */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => signOut()}
                    className={`absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full border transition-all backdrop-blur-md z-50 font-medium ${theme === 'dark'
                        ? 'bg-[#1e293b] border-white/10 text-gray-300 hover:bg-white/10 shadow-lg'
                        : 'bg-white border-transparent text-gray-600 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                        }`}
                >
                    <LogOut size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className="text-sm">Back to Login</span>
                </motion.button>

                {/* Theme Toggle */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`absolute top-4 right-4 p-3 rounded-full border transition-all backdrop-blur-md z-50 group ${theme === 'dark'
                        ? 'bg-[#1e293b] border-white/10 hover:bg-white/10 shadow-lg'
                        : 'bg-white border-transparent hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                        }`}
                >
                    <AnimatePresence mode="wait">
                        {theme === 'dark' ? (
                            <motion.div
                                key="sun"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sun size={20} className="text-yellow-500 group-hover:text-yellow-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="moon"
                                initial={{ rotate: 90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: -90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Moon size={20} className="text-blue-500 group-hover:text-blue-600" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg mt-16 md:mt-8"
                >
                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="h-20 w-20 bg-[#00D09E]/10 rounded-full flex items-center justify-center p-4 mx-auto mb-4 backdrop-blur-md overflow-hidden shadow-lg border border-[#00D09E]/20">
                            <img src="/logo.png" alt="Koprly" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-text-primary transition-colors duration-500">Welcome to Koprly</h1>
                        <p className="text-text-secondary transition-colors duration-500 font-medium">Let's set up your financial profile.</p>
                    </div>

                    {/* Parent Card Removed for Better Mobile Responsiveness control per step */}
                    <AnimatePresence mode="wait">
                        {/* Step 1: User Identity */}
                        {step === 1 && (
                            <Card
                                key="step1"
                                glass
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-xl transition-colors duration-500
"
                            >
                                {/* Profile Picture */}
                                <div className="flex justify-center mb-8">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
                                    <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="user" className="hidden" />

                                    <div className="relative">
                                        <div
                                            className="h-28 w-28 rounded-full bg-gradient-to-br from-[#00D09E] via-[#0593ff] to-[#0593ff] flex items-center justify-center text-4xl font-bold dark:text-white text-black shadow-xl overflow-hidden cursor-pointer transition-transform hover:scale-105 border-4 border-white dark:border-[#1e293b]"
                                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                        >
                                            {profilePicture ? (
                                                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-black dark:text-white opacity-80">{initial}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                            className="absolute bottom-0 right-0 h-8 w-8 bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                                        >
                                            <Pencil size={14} className="text-white" />
                                        </button>

                                        <AnimatePresence>
                                            {showPhotoOptions && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white dark:bg-[#1a1a2e] text-[#1D1D1F] dark:text-white border border-border-color rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px]"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight dark:hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <ImageIcon size={18} className="text-primary" />
                                                        <span className="text-sm font-medium">Choose from Gallery</span>
                                                    </button>
                                                    <div className="h-px bg-border-color" />
                                                    <button
                                                        type="button"
                                                        onClick={() => cameraInputRef.current?.click()}
                                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight dark:hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <Camera size={18} className="text-primary" />
                                                        <span className="text-sm font-medium">Take a Photo</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <Input
                                    label="What should we call you?"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.slice(0, 50))}
                                    icon={<User size={18} />}
                                    placeholder="e.g. Alex"
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{name.length}/50 characters</p>

                                <Button className="w-full mt-6" onClick={handleNext} disabled={!isStep1Valid}>
                                    Continue <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </Card>
                        )}

                        {/* Step 2: Wallet Setup */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-xl
"
                            >
                                <div className="text-center mb-4">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wallet size={24} className="text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-xl text-black dark:text-white">Where is your money?</h3>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1 max-w-[280px] mx-auto">
                                        Your wallets are where you keep your money—like <span className="text-primary font-bold">Bank Accounts</span>, <span className="text-secondary font-bold">E-wallets</span>, or <span className="text-warning font-bold">Physical Cash</span>.
                                    </p>
                                </div>

                                {/* Wallet Revolving Carousel */}
                                <div className="relative py-4 md:py-12 h-[340px] md:h-[380px] flex items-center justify-center perspective-1000">
                                    <div className="relative w-full max-w-[280px] md:max-w-[320px] h-full flex items-center justify-center">
                                        <AnimatePresence mode="popLayout">
                                            {wallets.map((wallet, idx) => {
                                                const offset = idx - activeWalletIndex;
                                                const isVisible = Math.abs(offset) <= 2;

                                                if (!isVisible) return null;

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, scale: 0.8, x: offset * 100 }}
                                                        animate={{
                                                            opacity: 1 - Math.abs(offset) * 0.3,
                                                            scale: 1 - Math.abs(offset) * 0.1,
                                                            x: offset * 40,
                                                            y: Math.abs(offset) * 15,
                                                            zIndex: 10 - Math.abs(offset),
                                                            rotate: offset * 2,
                                                        }}
                                                        exit={{ opacity: 0, scale: 0.8, x: offset * 100 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: 0 }}
                                                        onDragEnd={(_, info) => {
                                                            if (info.offset.x < -50 && activeWalletIndex < wallets.length - 1) {
                                                                setActiveWalletIndex(prev => prev + 1);
                                                            } else if (info.offset.x > 50 && activeWalletIndex > 0) {
                                                                setActiveWalletIndex(prev => prev - 1);
                                                            }
                                                        }}
                                                        className="absolute w-full aspect-[4/3] rounded-[32px] p-4 md:p-6 shadow-xl dark:shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden"
                                                        style={{
                                                            backgroundColor: wallet.color || '#007AFF',
                                                            pointerEvents: idx === activeWalletIndex ? 'auto' : 'none'
                                                        }}
                                                    >
                                                        {/* Glass Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-60 pointer-events-none" />

                                                        {/* Delete Button */}
                                                        {wallets.length > 1 && idx === activeWalletIndex && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setWalletToDelete(activeWalletIndex);
                                                                    setShowDeleteConfirm(true);
                                                                }}
                                                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-error/20 backdrop-blur-md flex items-center justify-center text-error hover:bg-error/30 transition-all z-20"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}

                                                        <div className="relative z-10 h-full flex flex-col justify-between">
                                                            <div className="flex items-center gap-4 pr-12">
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={() => setActiveIconPickerIndex(activeIconPickerIndex === idx ? null : idx)}
                                                                        className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white relative group"
                                                                    >
                                                                        {(() => {
                                                                            const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                                            return <IconComponent size={24} className="md:w-8 md:h-8" />;
                                                                        })()}
                                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-white flex items-center justify-center shadow-lg text-primary">
                                                                            <Pencil size={10} className="md:w-3 md:h-3" />
                                                                        </div>
                                                                    </button>

                                                                    <AnimatePresence>
                                                                        {activeIconPickerIndex === idx && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                                className="absolute top-full left-0 mt-4 p-4 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-white/20 rounded-[24px] grid grid-cols-3 gap-2 z-[100] shadow-2xl min-w-[200px]"
                                                                            >
                                                                                {WALLET_ICONS.map(({ type, Icon }) => (
                                                                                    <button
                                                                                        key={type}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            updateWallet(idx, 'type', type);
                                                                                            setActiveIconPickerIndex(null);
                                                                                        }}
                                                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${wallet.type === type ? 'bg-primary text-white scale-110' : 'bg-surface-highlight text-text-secondary hover:bg-primary/20 hover:text-primary'}`}
                                                                                    >
                                                                                        <Icon size={24} />
                                                                                    </button>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <input
                                                                            type="text"
                                                                            value={wallet.name}
                                                                            onChange={(e) => updateWallet(idx, 'name', e.target.value)}
                                                                            className="w-full bg-transparent border-none p-0 text-lg md:text-xl font-black text-white placeholder:text-white/40 focus:ring-0"
                                                                            placeholder="Wallet Name"
                                                                        />
                                                                        <Pencil size={14} className="text-white/60 flex-shrink-0" />
                                                                    </div>
                                                                    {idx === 0 && (
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                                                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.15em] opacity-80">Primary Wallet</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="bg-white/20 backdrop-blur-md rounded-[24px] px-6 py-5 border border-white/20">
                                                                <div className="flex items-baseline gap-3">
                                                                    <span className="text-sm font-black text-white uppercase opacity-70 tracking-tighter">{currencySymbol}</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={wallet.balance}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '');
                                                                            updateWallet(idx, 'balance', val ? formatIDR(val) : '');
                                                                        }}
                                                                        className="w-full bg-transparent border-none p-0 text-2xl md:text-[32px] font-black text-white placeholder:text-white/30 focus:ring-0 font-numeric leading-none"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3 justify-between items-center pt-2">
                                                                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-80">Card Color</p>
                                                                <div className="flex gap-2">
                                                                    {WALLET_COLORS.map((color) => (
                                                                        <button
                                                                            key={color}
                                                                            onClick={() => updateWallet(idx, 'color', color)}
                                                                            className={`w-6 h-6 rounded-full border-2 transition-all ${wallet.color === color ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                                            style={{ backgroundColor: color }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Navigation Dots & Hints */}
                                <div className="mt-8 text-center space-y-4">
                                    <div className="flex justify-center gap-2">
                                        {wallets.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 transition-all duration-300 rounded-full ${i === activeWalletIndex ? 'w-10 bg-[#00D09E]' : 'bg-border-color w-1.5'}`}
                                            />
                                        ))}
                                    </div>

                                    {wallets.length > 1 && (
                                        <div className="flex items-center justify-center gap-6 text-[10px] font-black text-gray-400 dark:text-text-secondary/50 uppercase tracking-[0.3em]">
                                            <ArrowLeft size={16} strokeWidth={2.5} className="opacity-60" />
                                            <span>Swipe to Switch</span>
                                            <ChevronRight size={18} strokeWidth={2.5} className="opacity-60" />
                                        </div>
                                    )}

                                    {/* Dedicated Add Wallet CTA */}
                                    {wallets.length < 4 && (
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={addWallet}
                                            className="w-[200px] h-[60px] mx-auto rounded-[24px] border-2 border-dashed border-border-color flex items-center justify-center gap-3 text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-surface-highlight group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                <Plus size={16} />
                                            </div>
                                            <span className="text-sm font-bold uppercase tracking-widest">Add Wallet</span>
                                        </motion.button>
                                    )}
                                </div>

                                {/* Delete Confirmation Modal */}
                                <AnimatePresence>
                                    {showDeleteConfirm && walletToDelete !== null && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-white/20 dark:border-white/5 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
                                            >
                                                <div className="text-center mb-6">
                                                    <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                                                        <Trash2 size={32} className="text-error" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">Delete Wallet?</h3>
                                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                                        Are you sure you want to remove <span className="font-bold text-black dark:text-white">"{wallets[walletToDelete]?.name}"</span>?
                                                        <br />This action cannot be undone.
                                                    </p>
                                                </div>

                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="secondary"
                                                        className="flex-1"
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        className="flex-1 bg-error hover:bg-error/90 border-none text-white shadow-lg shadow-error/20"
                                                        onClick={() => removeWallet(walletToDelete)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex gap-4 mt-6">
                                    <Button variant="ghost" className="flex-1" onClick={handleBack}>
                                        Back
                                    </Button>
                                    <Button
                                        className="flex-[2] bg-gradient-to-r from-primary to-emerald-500 border-none shadow-lg shadow-primary/20"
                                        onClick={handleNext}
                                        disabled={!isStep2Valid}
                                    >
                                        Next Step <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Budget & Categories */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/40 dark:border-white/5 shadow-xl
"
                            >
                                <div className="text-center mb-6">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Target size={24} className="text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-xl text-black dark:text-white">What's your plan?</h3>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Set a monthly spending limit and allocate it to categories.</p>
                                </div>

                                {/* Total Wealth Indicator */}
                                <div className="px-6 py-4 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Balance</p>
                                        <p className="text-2xl font-black font-numeric text-primary">{currencySymbol}{formatIDR(totalWealth)}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                        <Wallet size={24} />
                                    </div>
                                </div>

                                {/* Spending Limit Input */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-bold text-text-primary dark:text-white">Monthly Spending Limit</label>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-primary font-numeric">{budgetPercentage}%</span>
                                            <p className="text-[10px] text-gray-500 dark:text-text-secondary uppercase font-bold tracking-tighter">OF TOTAL WEALTH</p>
                                        </div>
                                    </div>

                                    <div className="relative h-2 flex items-center mb-8">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={budgetPercentage}
                                            onChange={(e) => applySuggestion(parseInt(e.target.value))}
                                            className="w-full h-2 bg-surface-highlight dark:bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        {[0, 25, 50, 75, 100].map((tick) => (
                                            <div
                                                key={tick}
                                                className="absolute top-4 text-[10px] font-bold text-text-secondary/50"
                                                style={{ left: `${tick}%`, transform: 'translateX(-50%)' }}
                                            >
                                                {tick}%
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-surface-highlight dark:bg-white/5 border border-border-color dark:border-white/10 mt-4 focus-within:border-primary transition-all">
                                        <span className="text-text-secondary font-medium text-lg">{currencySymbol}</span>
                                        <input
                                            type="text"
                                            value={spendingLimit}
                                            onChange={(e) => {
                                                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                                setSpendingLimit(cleaned ? formatIDR(cleaned) : '');
                                                const limit = parseInt(cleaned || '0');
                                                setBudgetPercentage(totalWealth > 0 ? Math.round((limit / totalWealth) * 100) : 0);
                                            }}
                                            placeholder="0"
                                            className="flex-1 bg-transparent outline-none text-2xl font-bold text-text-primary dark:text-white placeholder:text-text-secondary/30 font-numeric"
                                        />
                                        <Pencil size={18} className="text-primary/50" />
                                    </div>
                                </div>

                                {/* Categories Section */}
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-md text-black dark:text-white">Categories</h4>
                                        <button
                                            onClick={() => toggleAutoAllocation(!isAutoAllocated)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${isAutoAllocated
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                : 'bg-surface-highlight dark:bg-white/5 border-border-color dark:border-white/10 text-text-secondary hover:bg-primary/10 hover:text-primary'
                                                }`}
                                        >
                                            <Sparkles size={12} />
                                            {isAutoAllocated ? 'Auto-Allocated' : 'Auto-Allocate'}
                                        </button>
                                    </div>

                                    <div className="max-h-[240px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                        {onboardingCategories.map((cat) => {
                                            const limit = parseIDR(spendingLimit) || 0;
                                            const catLimit = cat.monthly_budget || 0;
                                            const percentage = limit > 0 ? (catLimit / limit) * 100 : 0;

                                            return (
                                                <GlassCard
                                                    key={cat.id}
                                                    className="p-3 cursor-pointer group hover:border-primary/50 transition-all"
                                                    variant="elevated"
                                                    onClick={() => {
                                                        setSelectedCategory(cat);
                                                        setIsCategoryModalOpen(true);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <CategoryIcon iconName={cat.icon} categoryColor={cat.color} variant="default" />
                                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-[#1E293B] rounded-full flex items-center justify-center shadow-sm">
                                                                    <Pencil size={8} className="text-primary" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-bold block leading-tight text-text-primary dark:text-white">{cat.name}</span>
                                                                <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Tap to Edit</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-text-primary dark:text-white font-numeric">
                                                                {currencySymbol}{formatIDR(cat.monthly_budget || 0)}
                                                            </div>
                                                            <div className={`text-[10px] font-bold ${percentage > 100 ? 'text-error' : 'text-text-secondary'}`}>
                                                                {Math.round(percentage)}% of limit
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <ProgressBarGlow
                                                        progress={percentage}
                                                        color={percentage > 100 ? '#FF3B30' : cat.color}
                                                        height={6}
                                                    />
                                                </GlassCard>
                                            );
                                        })}

                                        <button
                                            onClick={() => {
                                                setSelectedCategory(null);
                                                setIsCategoryModalOpen(true);
                                            }}
                                            className="w-full p-4 rounded-2xl border-2 border-dashed border-border-color dark:border-white/10 flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                        >
                                            <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                            <span className="text-sm font-bold uppercase tracking-widest">Add Category</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <Button variant="ghost" className="flex-1" onClick={handleBack}>
                                        Back
                                    </Button>
                                    <Button
                                        className="flex-[2] bg-gradient-to-r from-primary to-emerald-500 border-none shadow-lg shadow-primary/20"
                                        onClick={handleNext}
                                        disabled={!isStep3Valid}
                                    >
                                        Review Date <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Budget Period */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-xl
"
                            >
                                <div className="text-center mb-8">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Calendar size={24} className="text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-xl text-black dark:text-white">When to reset?</h3>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Select your budget cycle start date.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-text-primary dark:text-white block px-1">Day of Month</label>
                                        <div className="grid grid-cols-7 gap-2">
                                            {[...Array(31)].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setResetDay(i + 1)}
                                                    className={`h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all border ${resetDay === i + 1
                                                        ? 'bg-primary text-white border-primary shadow-md scale-110 z-10'
                                                        : 'bg-surface-highlight dark:bg-white/5 border-border-color dark:border-white/10 text-text-secondary hover:border-primary/50'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setResetDay(-1)}
                                                className={`col-span-2 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-tighter transition-all border ${resetDay === -1
                                                    ? 'bg-primary text-white border-primary shadow-md scale-105 z-10'
                                                    : 'bg-surface-highlight dark:bg-white/5 border-border-color dark:border-white/10 text-text-secondary hover:border-primary/50'
                                                    }`}
                                            >
                                                Last Day
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                                    💡 Your spending limits will automatically reset on the <strong>{resetDay === -1 ? 'last day' : resetDay + (resetDay === 1 ? 'st' : resetDay === 2 ? 'nd' : resetDay === 3 ? 'rd' : 'th')}</strong> of every month.
                                </p>

                                <div className="flex gap-4 mt-10">
                                    <Button variant="ghost" className="flex-1" onClick={handleBack}>
                                        Back
                                    </Button>
                                    <Button
                                        className="flex-[2] bg-gradient-to-r from-primary to-emerald-500 border-none shadow-lg shadow-primary/20"
                                        onClick={handleNext}
                                        disabled={!isStep4Valid}
                                    >
                                        Final Summary <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Summary */}
                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-xl
"
                            >
                                <div className="text-center mb-6">
                                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 scale-animation">
                                        <Check size={32} className="text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-2xl text-black dark:text-white">Review & Complete</h3>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Everything looks great, {name}!</p>
                                </div>

                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-surface-highlight dark:bg-white/5 border border-border-color dark:border-white/10">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Total Wealth</p>
                                            <p className="text-lg font-black text-text-primary dark:text-white font-numeric">{currencySymbol}{formatIDR(totalWealth)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-surface-highlight dark:bg-white/5 border border-border-color dark:border-white/10">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Monthly Limit</p>
                                            <p className="text-lg font-black text-primary font-numeric">{currencySymbol}{spendingLimit || '0'}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-surface-highlight dark:bg-white/5 border border-border-color dark:border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Wallets ({wallets.length})</p>
                                            <button onClick={() => setStep(2)} className="text-[10px] font-black text-primary uppercase">Edit</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {wallets.map((w, i) => (
                                                <div key={i} className="px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-color dark:border-white/10 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                                                    <span className="text-xs font-bold text-text-primary dark:text-white">{w.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-surface-highlight dark:bg-white/5 border border-border-color dark:border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Categories ({onboardingCategories.length})</p>
                                            <button onClick={() => setStep(3)} className="text-[10px] font-black text-primary uppercase">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {onboardingCategories.filter(c => (c.monthly_budget || 0) > 0).slice(0, 4).map((c) => (
                                                <div key={c.id} className="flex items-center gap-2">
                                                    <span className="text-sm">{c.icon}</span>
                                                    <span className="text-xs font-medium text-text-secondary truncate">{c.name}</span>
                                                </div>
                                            ))}
                                            {onboardingCategories.filter(c => (c.monthly_budget || 0) > 0).length > 4 && (
                                                <span className="text-[10px] text-text-secondary font-bold mt-1">+{onboardingCategories.filter(c => (c.monthly_budget || 0) > 0).length - 4} more</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} className="text-primary" />
                                            <div>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Reset Day</p>
                                                <p className="text-sm font-bold text-text-primary dark:text-white">Every {periodType === 'monthly' ? 'Month' : 'Week'} on {resetDay === -1 ? 'Last Day' : resetDay}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setStep(4)} className="text-[10px] font-black text-primary uppercase">Edit</button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-8">
                                    <Button
                                        className="w-full bg-gradient-to-r from-primary to-emerald-500 border-none shadow-lg shadow-primary/20"
                                        onClick={handleSubmit}
                                        isLoading={loading}
                                    >
                                        Launch Koprly <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                    <Button variant="ghost" onClick={handleBack} disabled={loading} className="font-bold">
                                        I want to change something
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Add Category Modal */}
                        <AddCategoryModal
                            isOpen={isCategoryModalOpen}
                            onClose={() => setIsCategoryModalOpen(false)}
                            onSuccess={async () => { }} // Not used in local mode
                            user_id={user?.id || ''}
                            currencySymbol={currencySymbol}
                            initialCategory={selectedCategory}
                            onLocalSave={handleLocalSave}
                            onLocalDelete={handleLocalDelete}
                            originalBudget={parseIDR(spendingLimit)}
                            totalCategoryBudgets={onboardingCategories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0)}
                        />
                    </AnimatePresence>

                    {/* Shared Step Indicators */}
                    <div className="mt-10 flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-10 bg-[#22C55E]' : 'w-6 bg-gray-200 dark:bg-white/10'}`}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </AppLayout>
    );
}
