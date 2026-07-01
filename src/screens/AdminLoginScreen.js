import React, { useState, useEffect } from 'react';
import { Platform, View, Text } from 'react-native';

export default function AdminLoginScreen({ onLoginSuccess }) {
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (passcode === 'admin123') {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      window.alert('Access Denied: Incorrect passcode. Please try again.');
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This highly styled component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-white overflow-hidden font-sans items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E293B] border border-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        
        <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <span className="font-black text-yellow-950 text-4xl leading-none tracking-tighter">y</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Admin Portal</h1>
        <p className="text-gray-400 text-center mb-8 font-medium">Enter your clinic access code to continue</p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Passcode</label>
            <input 
              type="password"
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-5 py-4 bg-[#0F172A] border border-gray-700 rounded-xl text-center text-xl tracking-[0.2em] font-medium outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-white transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 rounded-xl font-bold text-lg transition-all shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Access Dashboard
          </button>
        </form>
        
      </div>
    </div>
  );
}
