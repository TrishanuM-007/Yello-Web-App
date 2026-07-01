import React, { useState, useEffect } from 'react';
import { Menu, Settings, Moon, LogOut, MessageSquare } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AdminSettingsScreen({ navigation }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  const [bookingTemplate, setBookingTemplate] = useState('A booking at [time] on [date] has been scheduled with [patient_name].');
  const [feedbackTemplate, setFeedbackTemplate] = useState('Thank You for Visiting YelloMedi [patient_name], please leave a review here: [link]');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bookingTemplate) setBookingTemplate(data.bookingTemplate);
        if (data.feedbackTemplate) setFeedbackTemplate(data.feedbackTemplate);
      }
    });
    return () => unsub();
  }, []);

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        bookingTemplate,
        feedbackTemplate
      }, { merge: true });
      toast.success('Templates saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save templates.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    // In our pure web refactor, App.js handles the auth gateway based on Firebase.
    // If you are using local navigation without Firebase auth, this resets the stack.
    // However, window.location.reload() might be a cleaner hard reset for Web.
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white overflow-hidden font-sans">
      
      

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col gap-2 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Admin Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage application preferences and session.</p>
        </header>

        <div className="max-w-2xl w-full flex flex-col gap-6">
          
          {/* Appearance Section */}
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">Appearance</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-yellow-400">
                  <Moon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Dark Mode</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark theme across the application</p>
                </div>
              </div>

              {/* Custom CSS Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isDarkMode} 
                  onChange={toggleTheme} 
                />
                <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>

            </div>
          </div>

          {/* WhatsApp Message Templates Section */}
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-green-500">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp Message Templates</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customize the automated WhatsApp messages. Use exact variables like [patient_name], [date], and [time].</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Booking Confirmation Template</label>
                <textarea 
                  value={bookingTemplate}
                  onChange={(e) => setBookingTemplate(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors resize-y"
                  placeholder="A booking at [time] on [date] has been scheduled with [patient_name]."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Checkout/Feedback Template</label>
                <textarea 
                  value={feedbackTemplate}
                  onChange={(e) => setFeedbackTemplate(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors resize-y"
                  placeholder="Thank You for Visiting YelloMedi [patient_name], please leave a review here: [link]"
                />
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleSaveTemplates}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${isSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950'}`}
                >
                  {isSaving ? 'Saving...' : 'Save Templates'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

        </div>
      </main>

      
  </div>
    );
}
