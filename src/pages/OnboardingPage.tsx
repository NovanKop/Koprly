import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AppLayout } from '../layouts/AppLayout';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Plus, X, Pencil, Camera, Image as ImageIcon, Calendar, Wallet, Target, Check, Sparkles, Sun, Moon, CreditCard, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatIDR, parseIDR } from '../utils/currencyFormatter';
import { WALLET_ICONS, WALLET_COLORS } from '../lib/constants';

interface InitialWallet {
    name: string;
    type: string;
    balance: string;
    color?: string;
}

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
    const { user, signOut } = useAuth();
    const { currency, theme, setTheme } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [step, setStep] = useState(1); // 1: Identity, 2: Budget Period, 3: Wallets, 4: Spending Limit

    // Profile Picture State
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Step 2: Budget Period
    const [periodType, setPeriodType] = useState<'monthly' | 'weekly' | 'rolling'>('monthly');
    const [resetDay, setResetDay] = useState<number>(1); // 1-31, -1 for Last Day

    // Step 3: Wallets
    const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);
    const [wallets, setWallets] = useState<InitialWallet[]>([
        { name: 'Main Bank', type: 'bank', balance: '', color: WALLET_COLORS[0] },
    ]);

    // Step 4: Spending Limit
    const [spendingLimit, setSpendingLimit] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Calculate total wealth from wallets
    const totalWealth = wallets.reduce((sum, w) => sum + (parseIDR(w.balance) || 0), 0);

    // Currency symbol
    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    // Smart suggestions for spending limit
    const suggestions = [
        { percent: 80, amount: Math.floor(totalWealth * 0.8), label: '80%', savings: Math.floor(totalWealth * 0.2) },
        { percent: 90, amount: Math.floor(totalWealth * 0.9), label: '90%', savings: Math.floor(totalWealth * 0.1) },
        { percent: 100, amount: totalWealth, label: '100%', savings: 0 },
    ];

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
        if (step < 4) setStep(step + 1);
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
    };

    const removeWallet = (index: number) => {
        if (wallets.length > 1) {
            setWallets(wallets.filter((_, i) => i !== index));
        }
    };

    const updateWallet = (index: number, field: keyof InitialWallet, value: string) => {
        const newWallets = [...wallets];
        // @ts-ignore
        newWallets[index] = { ...newWallets[index], [field]: value };
        setWallets(newWallets);
    };

    // Handle spending limit input with IDR formatting
    const handleSpendingLimitChange = (value: string) => {
        // Remove non-numeric characters except dots
        const cleaned = value.replace(/[^0-9]/g, '');
        setSpendingLimit(cleaned ? formatIDR(cleaned) : '');
    };

    // Apply suggestion
    const applySuggestion = (amount: number) => {
        setSpendingLimit(formatIDR(amount));
    };

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

            // 4. Create Default Categories
            await api.createDefaultCategories(user.id);

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
    const isStep3Valid = wallets.length >= 1 && wallets.every(w => w.name && w.balance);
    const isStep4Valid = parseIDR(spendingLimit) > 0;

    // Warning for unrealistic budget
    const spendingLimitValue = parseIDR(spendingLimit);
    const showBudgetWarning = spendingLimitValue > totalWealth * 1.5 && totalWealth > 0;

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
                    className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-color shadow-lg hover:bg-surface-highlight transition-all backdrop-blur-md z-50 text-text-secondary hover:text-error"
                >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Back to Login</span>
                </motion.button>

                {/* Theme Toggle */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="absolute top-4 right-4 p-3 rounded-full bg-surface border border-border-color shadow-lg hover:bg-surface/80 transition-all backdrop-blur-md z-50 group"
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
                                <Sun size={20} className="text-yellow-400 group-hover:text-yellow-300" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="moon"
                                initial={{ rotate: 90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: -90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Moon size={20} className="text-blue-500 group-hover:text-blue-400" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4 backdrop-blur-md overflow-hidden">
                            <img src="/logo.png" alt="Koprly" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Welcome to Koprly</h1>
                        <p className="text-gray-400">Let's set up your financial profile.</p>
                    </div>

                    <Card glass className="p-8 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] dark:shadow-2xl border border-black/5 dark:border-white/10">
                        <AnimatePresence mode="wait">
                            {/* Step 1: User Identity */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                >
                                    {/* Profile Picture */}
                                    <div className="flex justify-center mb-8">
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="user" className="hidden" />

                                        <div className="relative">
                                            <div
                                                className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold shadow-xl overflow-hidden cursor-pointer transition-transform hover:scale-105"
                                                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                            >
                                                {profilePicture ? (
                                                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    initial
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
                                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 !bg-[#ffffff] dark:!bg-[#1a1a2e] !text-[#1D1D1F] dark:!text-white border border-border-color rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px]"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight transition-colors text-left"
                                                        >
                                                            <ImageIcon size={18} className="text-primary" />
                                                            <span className="text-sm font-medium">Choose from Gallery</span>
                                                        </button>
                                                        <div className="h-px bg-border-color" />
                                                        <button
                                                            type="button"
                                                            onClick={() => cameraInputRef.current?.click()}
                                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight transition-colors text-left"
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
                                    <p className="text-xs text-gray-500 mt-1">{name.length}/50 characters</p>

                                    <Button className="w-full mt-6" onClick={handleNext} disabled={!isStep1Valid}>
                                        Continue <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </motion.div>
                            )}

                            {/* Step 2: Budget Period */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Calendar size={24} className="text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Budget Period</h3>
                                        <p className="text-sm text-gray-400">When should your budgets reset?</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Monthly Option */}
                                        <div
                                            onClick={() => setPeriodType('monthly')}
                                            className={`w-full p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${periodType === 'monthly'
                                                ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                                : 'bg-surface border-border-color hover:bg-surface-highlight'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${periodType === 'monthly' ? 'border-primary bg-primary' : 'border-gray-500'
                                                    }`}>
                                                    {periodType === 'monthly' && <Check size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Monthly</span>
                                                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Recommended</span>
                                                    </div>
                                                    <p className="text-sm text-gray-400">Resets every month</p>
                                                </div>
                                            </div>

                                            {/* Date Picker (Only visible when Monthly is selected) */}
                                            <AnimatePresence>
                                                {periodType === 'monthly' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="space-y-3 pl-9 overflow-hidden"
                                                    >
                                                        <p className="text-sm text-text-primary">
                                                            Reset Date: <span className="text-primary font-bold">{resetDay === -1 ? 'Last Day' : `${resetDay}${['st', 'nd', 'rd'][((resetDay % 10) - 1)] || 'th'}`}</span> of the month
                                                        </p>

                                                        {/* Horizontal Date Picker */}
                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                                            {/* Last Day Button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setResetDay(-1); }}
                                                                className={`flex-none px-4 py-2 rounded-2xl border text-sm font-medium transition-all snap-center whitespace-nowrap ${resetDay === -1
                                                                    ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                                                    : 'bg-surface border-border-color text-text-secondary hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                Last Day
                                                            </button>

                                                            {/* days 1-31 */}
                                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                                <button
                                                                    key={day}
                                                                    onClick={(e) => { e.stopPropagation(); setResetDay(day); }}
                                                                    className={`flex-none w-10 h-10 rounded-full border text-sm font-medium transition-all snap-center flex items-center justify-center ${resetDay === day
                                                                        ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                                                        : 'bg-surface border-border-color text-text-secondary hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <p className="text-xs text-primary/80 italic">
                                                            Your budget will reset every {resetDay === -1 ? 'last day' : `${resetDay}${['st', 'nd', 'rd'][((resetDay % 10) - 1)] || 'th'}`} of the month.
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Disabled Options */}
                                        {['weekly', 'rolling'].map((opt) => (
                                            <div
                                                key={opt}
                                                className="w-full p-4 rounded-3xl border border-border-color bg-surface/50 opacity-60 flex items-center gap-4 cursor-not-allowed relative"
                                            >
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium capitalize">{opt}</span>
                                                        <span className="text-[10px] bg-white/10 text-text-secondary px-2 py-0.5 rounded-full">Coming Soon</span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 capitalize">{opt === 'weekly' ? 'Resets every Monday' : 'Continuous, no auto-reset'}</p>
                                                </div>
                                            </div>
                                        ))}

                                    </div>

                                    <Button className="w-full" onClick={handleNext}>
                                        Next Step <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </motion.div>
                            )}

                            {/* Step 3: Wallet Setup */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                >
                                    <div className="text-center mb-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Wallet size={24} className="text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Set up your Wallets</h3>
                                        <p className="text-sm text-text-secondary">Include your Bank Accounts, E-Wallets, Cash, or Investments.</p>
                                    </div>

                                    {/* Total Wealth Display */}
                                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 mb-4 text-center">
                                        <p className="text-sm text-gray-400">Total Wealth</p>
                                        <p className="text-2xl font-bold text-primary">{currencySymbol} {formatIDR(totalWealth)}</p>
                                    </div>

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 pb-4">
                                        {wallets.map((wallet, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className={`p-4 rounded-2xl border border-border-color shadow-sm relative overflow-visible transition-all duration-300 ${!wallet.color ? 'bg-surface' : 'text-white'}`}
                                                style={{ backgroundColor: wallet.color || undefined }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon Picker */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveIconPickerIndex(activeIconPickerIndex === idx ? null : idx);
                                                            }}
                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-border-color hover:border-primary transition-all relative group ${wallet.color ? 'bg-white/20 text-white border-white/30' : 'bg-surface-highlight text-text-primary'}`}
                                                        >
                                                            {(() => {
                                                                const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                                return <IconComponent size={24} />;
                                                            })()}
                                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm ${wallet.color ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                                                <Pencil size={10} />
                                                            </div>
                                                        </button>

                                                        {/* Icon Dropdown */}
                                                        {activeIconPickerIndex === idx && (
                                                            <div className="absolute top-full left-0 mt-2 p-3 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-border-color rounded-2xl grid grid-cols-3 gap-2 z-50 shadow-2xl min-w-[180px]">
                                                                <div className="col-span-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1 mb-2">Select Icon</div>
                                                                {WALLET_ICONS.map(({ type, Icon, label }) => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateWallet(idx, 'type', type);
                                                                            setActiveIconPickerIndex(null);
                                                                        }}
                                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl hover:bg-primary/20 transition-all group/icon ${wallet.type === type ? 'bg-primary/20 ring-2 ring-primary text-primary' : 'bg-surface-highlight text-text-secondary hover:text-primary'} `}
                                                                        title={label}
                                                                    >
                                                                        <Icon size={24} strokeWidth={wallet.type === type ? 2.5 : 2} />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name & Balance */}
                                                    <div className="flex-1 space-y-3">
                                                        <div className="relative group/input">
                                                            <input
                                                                type="text"
                                                                value={wallet.name}
                                                                onChange={(e) => updateWallet(idx, 'name', e.target.value)}
                                                                placeholder="Wallet Name"
                                                                className={`w-full bg-transparent border-b pb-1 text-sm font-bold focus:outline-none transition-colors pr-6 ${wallet.color ? 'text-white border-white/50 focus:border-white placeholder:text-white/50' : 'text-text-primary border-border-color focus:border-primary placeholder:text-text-secondary/50'}`}
                                                            />
                                                            <Pencil size={12} className={`absolute right-0 top-1 opacity-50 group-hover/input:opacity-100 transition-opacity pointer-events-none ${wallet.color ? 'text-white' : 'text-text-secondary'}`} />
                                                        </div>

                                                        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border transition-all ${wallet.color ? 'bg-white/20 border-white/30 focus-within:bg-white/30 focus-within:border-white' : 'bg-surface-highlight/50 border-border-color/50 focus-within:border-primary/50 focus-within:bg-surface-highlight'}`}>
                                                            <span className={`font-medium ${wallet.color ? 'text-white/80' : 'text-text-secondary'}`}>{currencySymbol}</span>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={wallet.balance}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    updateWallet(idx, 'balance', val ? formatIDR(val) : '');
                                                                }}
                                                                placeholder="0"
                                                                className={`w-full bg-transparent border-none p-0 text-lg font-bold focus:ring-0 ${wallet.color ? 'text-white placeholder:text-white/30' : 'text-text-primary placeholder:text-text-secondary/30'}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {wallets.length > 1 && (
                                                        <button
                                                            onClick={() => removeWallet(idx)}
                                                            className={`p-2 rounded-full transition-colors self-center ${wallet.color ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-text-secondary hover:text-error hover:bg-error/10'}`}
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Color Picker */}
                                                <div className="flex gap-2 mt-4 pt-3 border-t border-white/10 dark:border-white/5 overflow-x-visible p-1">
                                                    {WALLET_COLORS.map((color) => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateWallet(idx, 'color', color)}
                                                            className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${wallet.color === color ? 'scale-125 ring-2 ring-white shadow-lg z-10' : 'hover:scale-110 opacity-70 hover:opacity-100'} `}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {wallets.length < 4 && (
                                            <button
                                                onClick={addWallet}
                                                className="w-full py-3 rounded-xl border border-dashed border-border-color text-sm text-gray-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Add Another Wallet
                                            </button>
                                        )}
                                    </div>

                                    <Button className="w-full mt-6" onClick={handleNext} disabled={!isStep3Valid}>
                                        Next Step <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </motion.div>
                            )}

                            {/* Step 4: Spending Limit (The Anchor) */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                >
                                    <div className="text-center mb-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Target size={24} className="text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Set Your Spending Limit</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">This is your budget plan, separate from your wallet balance.</p>
                                    </div>

                                    {/* Total Wealth Reference */}
                                    <div className="bg-surface rounded-xl p-3 mb-4 flex items-center justify-between">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Your Total Wealth:</span>
                                        <span className="font-semibold">{currencySymbol} {formatIDR(totalWealth)}</span>
                                    </div>

                                    {/* Spending Limit Input */}
                                    <div className="mb-6 relative group/limit">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Monthly Spending Limit</label>
                                        <div className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-surface border border-border-color focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                                            <span className="text-text-secondary font-medium text-lg">{currencySymbol}</span>
                                            <input
                                                type="text"
                                                value={spendingLimit}
                                                onChange={(e) => handleSpendingLimitChange(e.target.value)}
                                                placeholder="0"
                                                className="flex-1 bg-transparent outline-none text-2xl font-bold text-text-primary placeholder:text-text-secondary/30"
                                            />
                                            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover/limit:bg-primary group-hover/limit:text-white transition-all pointer-events-none">
                                                <Pencil size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    {showBudgetWarning && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-4"
                                        >
                                            <p className="text-sm text-warning">
                                                ⚠️ Budget ({currencySymbol} {spendingLimit}) is much higher than your wallet ({currencySymbol} {formatIDR(totalWealth)}). This might not be realistic.
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Smart Suggestions */}
                                    <div className="mb-8">
                                        <p className="text-sm text-text-secondary mb-3 font-medium">Quick suggestions:</p>
                                        <div className="space-y-3">
                                            {suggestions.map((s) => {
                                                const isSelected = parseIDR(spendingLimit) === s.amount;
                                                return (
                                                    <button
                                                        key={s.percent}
                                                        onClick={() => applySuggestion(s.amount)}
                                                        disabled={totalWealth === 0}
                                                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${isSelected
                                                            ? 'bg-primary border-primary shadow-[0_4px_12px_rgba(34,197,94,0.3)]'
                                                            : 'bg-surface border-border-color hover:bg-surface-highlight hover:border-primary/30'
                                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isSelected
                                                                ? 'bg-white text-primary'
                                                                : 'bg-primary/10 text-primary'
                                                                }`}>
                                                                {s.label}
                                                            </div>
                                                            <div className="text-left">
                                                                <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                                                    Target
                                                                </div>
                                                                <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                                                                    Conservative plan
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className={`font-bold font-numeric ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                                                {currencySymbol} {formatIDR(s.amount)}
                                                            </div>
                                                            {s.savings > 0 && (
                                                                <div className={`text-xs font-medium mt-0.5 ${isSelected ? 'text-white/90' : 'text-primary'}`}>
                                                                    Save {currencySymbol} {formatIDR(s.savings)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleSubmit}
                                        disabled={!isStep4Valid}
                                        isLoading={loading}
                                    >
                                        <Sparkles size={18} className="mr-2" />
                                        Complete Setup
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Step Indicator */}
                        <div className="mt-8 flex justify-center gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div
                                    key={i}
                                    className={`h-1.5 w-8 rounded-full transition-all ${step >= i
                                        ? 'bg-[#22C55E] shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]'
                                        : 'bg-gray-500'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Back Button */}
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="w-full text-center text-sm text-gray-400 hover:text-white mt-4"
                            >
                                Back
                            </button>
                        )}
                    </Card>
                </motion.div>
            </div>
        </AppLayout>
    );
}
