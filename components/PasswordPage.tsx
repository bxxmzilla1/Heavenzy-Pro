import React, { useState } from 'react';

interface PasswordPageProps {
  onPasswordVerified: () => void;
}

const VALID_PASSWORDS = [
  'heavenzy1997@gmail.com',
  'karlcazanetwork@gmail.com',
  'idenunt5@gmail.com',
  'liam@tdmhq.com'
];

export const PasswordPage: React.FC<PasswordPageProps> = ({ onPasswordVerified }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Check if password is valid
    const isValid = VALID_PASSWORDS.some(
      validPassword => password.toLowerCase().trim() === validPassword.toLowerCase().trim()
    );

    if (!isValid) {
      setError('Invalid password. Please try again.');
      setIsLoading(false);
      return;
    }

    // Save password to IndexedDB
    try {
      await savePasswordToDb(password.trim());
      setIsLoading(false);
      onPasswordVerified();
    } catch (err) {
      console.error('Failed to save password:', err);
      setError('Failed to save password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fanciaga
            </h1>
            <p className="text-gray-400 text-sm">Enter your password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors text-white placeholder-gray-500"
                placeholder="Enter your password"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

import { savePasswordToDb } from '../utils/storageUtils';
