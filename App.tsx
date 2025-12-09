import React, { useState, useRef, useEffect, useCallback } from 'react';
import CameraView, { CameraViewHandle } from './components/CameraView';
import ControlPanel from './components/ControlPanel';
import { AppMode, AppSettings, Verbosity, AnalysisResult } from './types';
import { analyzeImage } from './services/geminiService';
import { ttsService } from './services/ttsService';
import { Settings, Play, Pause, Activity, Volume2, Mic } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.GENERAL);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcripts, setTranscripts] = useState<AnalysisResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    verbosity: Verbosity.STANDARD,
    speechRate: 1.0,
    autoNarration: false,
    autoInterval: 4000 // 4 seconds default for auto
  });
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const cameraRef = useRef<CameraViewHandle>(null);
  const processingRef = useRef(false); // Ref for thread-safe processing check in intervals
  const autoIntervalRef = useRef<number | null>(null);

  // Helper: Process a single frame
  const processFrame = useCallback(async (triggeredByAuto: boolean = false) => {
    if (!isCameraActive || (processingRef.current && triggeredByAuto)) return;

    const base64Image = cameraRef.current?.captureFrame();
    if (!base64Image) return;

    setIsProcessing(true);
    processingRef.current = true;

    try {
      // Provide audio feedback that processing started (optional, maybe a subtle click)
      // ttsService.playSound('shutter'); 

      const result = await analyzeImage(base64Image, currentMode, settings.verbosity);
      
      const newEntry: AnalysisResult = {
        text: result.text,
        priority: result.isUrgent ? 'urgent' : 'normal',
        timestamp: Date.now()
      };

      setTranscripts(prev => [newEntry, ...prev].slice(0, 10)); // Keep last 10
      ttsService.speak(result.text, newEntry.priority, settings);

    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to analyze scene.");
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [isCameraActive, currentMode, settings]);

  // Handle Mode Change
  const handleModeSelect = (mode: AppMode) => {
    setCurrentMode(mode);
    ttsService.speak(`${mode.toLowerCase().replace('_', ' ')} mode selected`, 'urgent', settings);
    // If auto is off, trigger immediate analysis on mode switch
    if (!settings.autoNarration && isCameraActive) {
      setTimeout(() => processFrame(), 500); // Small delay to let user point camera
    }
  };

  // Handle Auto Narration Interval
  useEffect(() => {
    if (isCameraActive && settings.autoNarration) {
      // Initial trigger
      processFrame(true);
      
      autoIntervalRef.current = window.setInterval(() => {
        processFrame(true);
      }, settings.autoInterval);
    } else {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    }

    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }
    };
  }, [isCameraActive, settings.autoNarration, settings.autoInterval, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => ttsService.stop();
  }, []);

  const toggleCamera = () => {
    const newState = !isCameraActive;
    setIsCameraActive(newState);
    ttsService.speak(newState ? "Camera started" : "Camera stopped", 'urgent', settings);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pb-20 md:pb-0 font-sans">
      
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 flex items-center gap-2">
          <EyeIcon /> AccessVision
        </h1>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 focus:ring-4 focus:ring-yellow-400"
          aria-label="Settings"
        >
          <Settings size={24} />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-600 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-white">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Reading Speed</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  value={settings.speechRate}
                  onChange={(e) => setSettings({...settings, speechRate: parseFloat(e.target.value)})}
                  className="w-full h-4 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-medium">Verbosity (Detail Level)</label>
                <div className="flex gap-2">
                  {[Verbosity.MINIMAL, Verbosity.STANDARD, Verbosity.DETAILED].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSettings({...settings, verbosity: v})}
                      className={`flex-1 py-3 rounded-lg font-bold border-2 ${settings.verbosity === v ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-gray-400 border-gray-600'}`}
                    >
                      {v.charAt(0) + v.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-medium">Auto-Narration Interval</label>
                <select 
                  value={settings.autoInterval}
                  onChange={(e) => setSettings({...settings, autoInterval: parseInt(e.target.value)})}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-yellow-400 outline-none"
                >
                  <option value={2000}>Fast (Every 2s)</option>
                  <option value={4000}>Normal (Every 4s)</option>
                  <option value={8000}>Relaxed (Every 8s)</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-400"
            >
              Close Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        
        {/* Top Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleCamera}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
              isCameraActive 
                ? 'bg-red-600 hover:bg-red-500 text-white' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isCameraActive ? <><Pause fill="currentColor" /> Stop Camera</> : <><Play fill="currentColor" /> Start Camera</>}
          </button>
          
          <button
             onClick={() => setSettings(s => ({...s, autoNarration: !s.autoNarration}))}
             disabled={!isCameraActive}
             className={`p-4 rounded-xl border-2 transition-colors ${
               settings.autoNarration 
                 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                 : 'bg-gray-800 border-gray-600 text-gray-400'
             }`}
             aria-label="Toggle Auto Narration"
          >
            <Activity size={24} />
          </button>
        </div>

        {/* Camera View */}
        <CameraView 
          ref={cameraRef} 
          isActive={isCameraActive} 
          onCameraError={(msg) => setErrorMsg(msg)} 
        />

        {/* Error Display */}
        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg text-red-200" role="alert">
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {/* Mode Controls */}
        <div className="mt-4">
          <h2 className="sr-only">Interpretation Modes</h2>
          <ControlPanel 
            currentMode={currentMode} 
            onModeSelect={handleModeSelect}
            isProcessing={isProcessing}
          />
        </div>

        {/* Live Transcript / Output */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 min-h-[200px] border border-gray-700 shadow-inner mt-4">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h3 className="text-xl font-semibold text-gray-300 flex items-center gap-2">
              <Volume2 className="text-yellow-400" /> Live Output
            </h3>
            {settings.autoNarration && (
              <span className="text-xs uppercase tracking-wider bg-green-900 text-green-300 px-2 py-1 rounded">
                Auto-Live
              </span>
            )}
          </div>
          
          <div className="space-y-4" aria-live="polite">
            {transcripts.length === 0 ? (
              <p className="text-gray-500 italic text-lg">
                {isCameraActive ? "Waiting for analysis..." : "Start camera to begin."}
              </p>
            ) : (
              transcripts.map((t, idx) => (
                <div key={t.timestamp} className={`transition-opacity duration-500 ${idx === 0 ? 'opacity-100' : 'opacity-60'}`}>
                  {idx === 0 && t.priority === 'urgent' && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2 uppercase">
                      Alert
                    </span>
                  )}
                  <p className={`text-lg md:text-2xl leading-relaxed ${idx === 0 ? 'text-white font-medium' : 'text-gray-400 text-base'}`}>
                    {t.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Context Help for Sighted Companions */}
        <div className="text-center text-gray-500 text-sm mt-8 pb-4">
          <p>AccessVision Assistant • Powered by Gemini AI</p>
        </div>

      </main>

      {/* Floating Action Button for Manual Trigger when NOT in Auto mode */}
      {isCameraActive && !settings.autoNarration && (
        <button
          onClick={() => processFrame()}
          disabled={isProcessing}
          className="fixed bottom-6 right-6 h-20 w-20 bg-yellow-500 hover:bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center focus:ring-4 focus:ring-white z-40 transition-transform active:scale-95"
          aria-label="Analyze Now"
        >
           {isProcessing ? (
             <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
           ) : (
             <Mic size={32} className="text-black" />
           )}
        </button>
      )}
    </div>
  );
};

// Simple Icon component for Header
const EyeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default App;