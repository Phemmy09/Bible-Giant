import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Cross } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { BRAND, MOTTOES } from '@/lib/constants';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    const result = login(password);
    setLoading(false);

    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-afc-navy flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />
      <div className="bg-particles" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / Emblem */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold-intense">
            <Cross className="w-10 h-10 text-afc-navy" strokeWidth={2.5} />
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-gold-gradient">
            Quizmaster Portal
          </h1>
          <p className="font-outfit text-afc-ivory-muted/50 text-sm mt-2">
            {BRAND.shortName} — Admin Access
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-afc-gold" />
            <h2 className="font-cinzel text-afc-ivory text-lg tracking-wider">
              Authenticate
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-outfit text-afc-ivory-muted/70 text-sm mb-2">
                Master Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-afc-gold/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg py-3 pl-10 pr-12 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:ring-1 focus:ring-afc-gold/30 focus:outline-none transition-all placeholder:text-afc-ivory-muted/20"
                  placeholder="Enter master password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-afc-ivory-muted/40 hover:text-afc-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-afc-crimson/10 border border-afc-crimson/30 rounded-lg px-4 py-3"
              >
                <p className="font-outfit text-afc-crimson-light text-sm">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className={`w-full py-3 rounded-xl font-cinzel font-bold tracking-wider transition-all ${
                loading || !password
                  ? 'bg-afc-gold/20 text-afc-gold/40 cursor-not-allowed'
                  : 'bg-gradient-gold text-afc-navy hover:shadow-gold-intense hover:scale-[1.02]'
              }`}
            >
              {loading ? 'Authenticating...' : 'Enter Portal'}
            </button>
          </form>

          <p className="font-outfit text-afc-ivory-muted/20 text-xs text-center mt-6">
            Demo password: <span className="text-afc-gold/30">BibleGiant2030!</span>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 font-playfair italic text-afc-gold/30 text-xs">
          "{MOTTOES.lightOfTheWorld.text}" — {MOTTOES.lightOfTheWorld.scripture}
        </p>
      </motion.div>
    </div>
  );
}
