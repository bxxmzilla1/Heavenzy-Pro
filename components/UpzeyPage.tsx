import React, { useState, useEffect, useCallback } from 'react';
import UpzeySidebar from './UpzeySidebar';
import { UpzeyImageMode } from './UpzeyImageMode';
import { UpzeyVideoMode } from './UpzeyVideoMode';
import { UpzeyHistorySidebar } from './UpzeyHistorySidebar';

export const UpzeyPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('image');
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (showLoading = true) => {
    const wavespeedApiKey = localStorage.getItem('wavespeedApiKey');
    if (!wavespeedApiKey) {
      setBalance(null);
      setBalanceError(null);
      return;
    }

    if (showLoading) {
      setIsBalanceLoading(true);
    }
    setBalanceError(null);
    try {
      const response = await fetch('https://api.wavespeed.ai/api/v3/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wavespeedApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if the response has the expected structure (Wavespeed API format)
      if (data.code === 200 && data.data && typeof data.data.balance === 'number') {
        setBalance(data.data.balance);
      } else if (typeof data.balance === 'number') {
        // Fallback for different response format
        setBalance(data.balance);
      } else if (data.code && data.code !== 200) {
        // API returned an error code
        throw new Error(data.message || data.msg || `API error: code ${data.code}`);
      } else {
        // Unexpected response structure
        console.error('Unexpected balance API response:', data);
        throw new Error(data.message || data.msg || "Invalid balance data received from API.");
      }

    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setBalance(null);
      setBalanceError(err.message || "Failed to fetch balance.");
    } finally {
      if (showLoading) {
        setIsBalanceLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchBalance(true); // Initial load with loading indicator
    // Refresh balance every second silently (without loading indicator)
    const interval = setInterval(() => {
      fetchBalance(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handleSelectHistoryImage = (url: string) => {
    // Could be used to load the image into the image mode
    setIsHistoryVisible(false);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-cyan-500/20 fixed top-0 left-24 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
              UPZEY
            </h1>
            <div className="p-2 rounded-full text-gray-400 bg-gray-800/50 flex items-center text-sm h-9 px-3">
              <i className="fas fa-wallet mr-2 text-cyan-400"></i>
              {isBalanceLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              ) : balanceError ? (
                <span className="text-red-400" title={balanceError}>Error</span>
              ) : balance !== null ? (
                <span className="font-semibold text-white">${balance.toFixed(2)}</span>
              ) : (
                <span className="text-gray-500">N/A</span>
              )}
            </div>
            <button
              onClick={() => setIsHistoryVisible(true)}
              className="p-2 rounded-lg transition-colors relative flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 bg-gray-800/50"
              title="Generation History"
            >
              <i className="fas fa-history text-base"></i>
              <span className="text-xs font-medium hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      {isHistoryVisible && (
        <UpzeyHistorySidebar
          onSelectImage={handleSelectHistoryImage}
          onClose={() => setIsHistoryVisible(false)}
        />
      )}

      {/* Sidebar */}
      <UpzeySidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Body Section - Adjusted for sidebar */}
      <div className="pt-20 md:ml-64">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {activeMenu === 'image' && <UpzeyImageMode />}
          {activeMenu === 'video' && <UpzeyVideoMode />}
        </div>
      </div>
    </div>
  );
};
