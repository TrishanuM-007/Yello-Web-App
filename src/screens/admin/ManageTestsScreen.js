import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Menu, Activity, Trash2, Plus, TestTube, IndianRupee } from 'lucide-react';
import { Platform, View, Text } from 'react-native';

export default function ManageTestsScreen() {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [testName, setTestName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [tests, setTests] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'available_tests'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTests(data);
      setFetching(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!testName.trim() || !price) {
      window.alert('Error: Please enter both test name and price.');
      return;
    }

    setLoading(true);
    try {
      const testsRef = collection(db, 'available_tests');
      await addDoc(testsRef, {
        testName: testName.trim(),
        price: parseFloat(price),
        createdAt: new Date().toISOString()
      });

      window.alert('Success: Test added successfully!');
      setTestName('');
      setPrice('');
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to add test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete Test: Are you sure you want to completely remove "${name}"? Patients will no longer be able to book it.`)) {
      (async () => {
        try {
          await deleteDoc(doc(db, 'available_tests', id));
        } catch (e) {
          console.error(e);
          window.alert('Error: Could not delete test');
        }
      })();
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
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>
      
      

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col gap-2 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Manage Lab Tests</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Publish new laboratory tests or manage existing catalog.</p>
        </header>

        <div className="flex flex-col gap-8 pb-24">
          
          {/* Add New Test Form */}
          <div className="w-full shrink-0">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col xl:flex-row xl:items-end gap-5">
              <div className="flex-shrink-0 xl:w-48 xl:border-r xl:border-gray-800 xl:pr-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-yellow-400" size={20} /> Add New Test
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Publish to catalog</p>
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row gap-5">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Test Name</label>
                  <div className="relative">
                    <TestTube size={16} className="absolute left-4 top-[14px] text-gray-500" />
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Complete Blood Count (CBC)"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Price</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-4 top-[14px] text-gray-500" />
                    <input 
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full xl:w-auto px-8 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shrink-0 ${
                  loading
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'
                }`}
              >
                {loading ? 'Publishing...' : 'Publish Test'}
              </button>
            </form>
          </div>

          {/* Published Tests Grid */}
          <div className="flex-1 w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Published Tests Catalog</h2>
            
            {fetching ? (
              <div className="py-20 text-center text-gray-500 animate-pulse">Loading catalog...</div>
            ) : tests.length === 0 ? (
              <div className="p-10 text-center text-gray-500 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl border-dashed">
                No tests published yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {tests.map(test => (
                  <div 
                    key={test.id} 
                    className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-start gap-4 overflow-hidden pr-2">
                      <div className="w-10 h-10 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                        <TestTube size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{test.testName || test.name}</h3>
                        <p className="text-yellow-400 font-bold mt-1 text-sm">₹{test.price}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(test.id, test.testName || test.name)}
                      className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0 opacity-0 group-hover:opacity-100 outline-none focus:opacity-100"
                      title="Delete Test"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      
  </div>
    );
}
