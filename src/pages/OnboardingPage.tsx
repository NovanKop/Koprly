import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AppLayout } from '../layouts/AppLayout';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Plus, X, CreditCard, Banknote, Pencil, Camera, Image as ImageIcon, Calendar, Edit2, DollarSign } from 'lucide-react';

interface InitialWallet {
    name: string;
    type: 'general' | 'cash' | 'bank';
    balance: string;
}

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
    const { user } = useAuth();
    const { setCurrency, setDateFormat, setFirstDayOfWeek } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');

    // Profile Picture State
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Preferences State
    const [selectedCurrency, setSelectedCurrency] = useState<'IDR' | 'USD'>('IDR');
    const [selectedFirstDay, setSelectedFirstDay] = useState<'Monday' | 'Sunday'>('Monday');
    const [selectedDateFormat, setSelectedDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY'>('DD/MM/YYYY');

    // Wallets State
    const [wallets, setWallets] = useState<InitialWallet[]>([
        { name: 'Main Bank', type: 'bank', balance: '' },
        { name: 'Cash', type: 'cash', balance: '' },
    ]);

    const [step, setStep] = useState(1); // 1: Name, 2: Preferences, 3: Wallets

    // Extract initial from name or email
    const initial = name ? name[0].toUpperCase() : (user?.email?.[0].toUpperCase() || 'U');

    // Handle file selection (gallery or camera)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        setShowPhotoOptions(false);
    };

    const handleContinue = () => {
        if (step === 1 && name.trim()) setStep(2);
        else if (step === 2) setStep(3);
    };

    const addWallet = () => {
        setWallets([...wallets, { name: `Wallet ${wallets.length + 1}`, type: 'general', balance: '' }]);
    };

    const removeWallet = (index: number) => {
        if (wallets.length > 1) {
            setWallets(wallets.filter((_, i) => i !== index));
        }
    };

    const updateWallet = (index: number, field: keyof InitialWallet, value: string) => {
        const newWallets = [...wallets];
        newWallets[index] = { ...newWallets[index], [field]: value };
        setWallets(newWallets);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Upload profile picture if selected
            let profilePictureUrl: string | undefined;
            if (profilePictureFile) {
                profilePictureUrl = await api.uploadProfilePicture(profilePictureFile);
            }

            // 2. Update Profile & Store Settings
            await api.updateProfile({
                username: name,
                ...(profilePictureUrl && { profile_picture: profilePictureUrl })
            });

            // Set global app preferences
            setCurrency(selectedCurrency);
            setFirstDayOfWeek(selectedFirstDay);
            setDateFormat(selectedDateFormat);

            // 3. Create Wallets
            for (const w of wallets) {
                if (w.name && w.balance) {
                    await api.createWallet({
                        user_id: user.id,
                        name: w.name,
                        type: w.type,
                        balance: parseFloat(w.balance),
                        color: w.type === 'cash' ? '#34C759' : '#007AFF' // Basic color assignment
                    });
                }
            }

            // 4. Create Default Categories
            await api.createDefaultCategories(user.id);

            onComplete();
        } catch (error) {
            console.error('Failed to setup profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Welcome to Koprly</h1>
                        <p className="text-gray-400">Let's set up your financial profile.</p>
                    </div>

                    <Card glass className="p-8">
                        {step === 1 && (
                            <div className="flex justify-center mb-8">
                                {/* Hidden file inputs */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <input
                                    type="file"
                                    ref={cameraInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    capture="user"
                                    className="hidden"
                                />

                                {/* Profile Picture with Pencil Overlay */}
                                <div className="relative z-[100]">
                                    <div
                                        className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold shadow-xl overflow-hidden cursor-pointer transition-transform hover:scale-105"
                                        onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                    >
                                        {profilePicture ? (
                                            <img
                                                src={profilePicture}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            initial
                                        )}
                                    </div>

                                    {/* Pencil Icon Overlay */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                        className="absolute bottom-0 right-0 h-8 w-8 bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Pencil size={14} className="text-white" />
                                    </button>

                                    {/* Photo Options Dropdown */}
                                    <AnimatePresence>
                                        {showPhotoOptions && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-[#1a1a2e] border border-border-color rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[180px]"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight transition-colors text-left"
                                                >
                                                    <ImageIcon size={18} className="text-primary" />
                                                    <span className="text-sm font-medium">Choose from Gallery</span>
                                                </button>
                                                <div className="h-px bg-border-color" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        cameraInputRef.current?.click();
                                                    }}
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
                        )}

                        <div className="space-y-6 relative z-0">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <Input
                                            label="What should we call you?"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            icon={<User size={18} />}
                                            placeholder="e.g. Alex"
                                        />
                                        <Button
                                            className="w-full mt-6"
                                            onClick={handleContinue}
                                            disabled={!name.trim()}
                                        >
                                            Continue <ArrowRight size={18} className="ml-2" />
                                        </Button>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        {/* Currency Selection */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                                                    <DollarSign size={16} />
                                                </div>
                                                <label className="block text-sm font-medium text-gray-300">Default Currency</label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {(['IDR', 'USD'] as const).map(curr => (
                                                    <button
                                                        key={curr}
                                                        onClick={() => setSelectedCurrency(curr)}
                                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedCurrency === curr
                                                            ? 'bg-primary border-primary text-white shadow-lg'
                                                            : 'bg-surface border-border-color hover:bg-surface-highlight text-gray-400'
                                                            }`}
                                                    >
                                                        {curr} ({curr === 'IDR' ? 'Rp' : '$'})
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* First Day of Week */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                                                    <Calendar size={16} />
                                                </div>
                                                <label className="block text-sm font-medium text-gray-300">First Day of Week</label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {(['Monday', 'Sunday'] as const).map(day => (
                                                    <button
                                                        key={day}
                                                        onClick={() => setSelectedFirstDay(day)}
                                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedFirstDay === day
                                                            ? 'bg-primary border-primary text-white shadow-lg'
                                                            : 'bg-surface border-border-color hover:bg-surface-highlight text-gray-400'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Date Format */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                                                    <Edit2 size={16} />
                                                </div>
                                                <label className="block text-sm font-medium text-gray-300">Date Format</label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {(['DD/MM/YYYY', 'MM/DD/YYYY'] as const).map(fmt => (
                                                    <button
                                                        key={fmt}
                                                        onClick={() => setSelectedDateFormat(fmt)}
                                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedDateFormat === fmt
                                                            ? 'bg-primary border-primary text-white shadow-lg'
                                                            : 'bg-surface border-border-color hover:bg-surface-highlight text-gray-400'
                                                            }`}
                                                    >
                                                        {fmt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full mt-6"
                                            onClick={handleContinue}
                                        >
                                            Next Step <ArrowRight size={18} className="ml-2" />
                                        </Button>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <div className="mb-4">
                                            <h3 className="font-semibold text-lg mb-1">Set up your Wallets</h3>
                                            <p className="text-sm text-gray-400">Add your accounts and their current balances.</p>
                                        </div>

                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {wallets.map((wallet, idx) => (
                                                <div key={idx} className="p-3 rounded-xl bg-surface/50 border border-border-color flex gap-3 items-start group">
                                                    <div className="mt-2.5 text-gray-400">
                                                        {wallet.type === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center gap-2 border-b border-dashed border-gray-600 focus-within:border-primary focus-within:border-solid transition-colors pb-1">
                                                            <input
                                                                type="text"
                                                                value={wallet.name}
                                                                onChange={(e) => updateWallet(idx, 'name', e.target.value)}
                                                                className="flex-1 bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 placeholder-gray-600"
                                                                placeholder="Wallet Name"
                                                            />
                                                            <Pencil size={12} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={wallet.balance}
                                                            onChange={(e) => updateWallet(idx, 'balance', e.target.value)}
                                                            className="w-full bg-black/20 rounded-lg border-none px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            placeholder="Current Balance"
                                                        />
                                                    </div>
                                                    {wallets.length > 1 && (
                                                        <button
                                                            onClick={() => removeWallet(idx)}
                                                            className="text-gray-600 hover:text-error transition-colors p-1"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={addWallet}
                                                className="w-full py-3 rounded-xl border border-dashed border-border-color text-sm text-gray-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Add Another Wallet
                                            </button>
                                        </div>

                                        <Button
                                            className="w-full mt-6"
                                            onClick={handleSubmit}
                                            disabled={wallets.some(w => !w.name || !w.balance)}
                                            isLoading={loading}
                                        >
                                            Complete Setup
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-8 flex justify-center gap-2">
                                {[1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-8 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-white/10'}`}
                                    />
                                ))}
                            </div>
                        </div>
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
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
