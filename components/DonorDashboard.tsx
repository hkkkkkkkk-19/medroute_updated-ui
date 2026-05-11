
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, Package, Activity, History, Truck, MapPin, Search, ArrowRight, X, Navigation } from 'lucide-react';
import { extractMedicineDetails } from '../verificationService.ts';
import { useLanguage } from '../LanguageContext.tsx';
import { backendService } from '../services/backendService.ts';
import { getRoadRoute } from '../aiService.ts';
import LiveMap from './LiveMap.tsx';
import { AuthContext } from '../App.tsx';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const ScooterAnimation = () => (
  <div className="relative w-full h-48 overflow-hidden bg-sky-50 rounded-[3rem] border border-sky-100 mb-8 flex items-center justify-center">
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-10 left-10 w-20 h-1 bg-sky-200 rounded-full animate-pulse"></div>
      <div className="absolute top-24 right-20 w-32 h-1 bg-sky-200 rounded-full animate-pulse delay-75"></div>
      <div className="absolute bottom-16 left-1/4 w-24 h-1 bg-sky-200 rounded-full animate-pulse delay-150"></div>
    </div>
    
    <div className="relative z-10 flex flex-col items-center">
      <div className="animate-bounce-slow">
        <div className="relative">
          {/* Scooter Body */}
          <div className="w-24 h-12 bg-indigo-600 rounded-t-[2rem] rounded-br-[1rem] relative">
            <div className="absolute -top-4 left-4 w-12 h-8 bg-indigo-500 rounded-t-full"></div>
            <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full"></div>
          </div>
          {/* Wheels */}
          <div className="flex justify-between px-2 -mt-2">
            <div className="w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-700 animate-spin-slow"></div>
            <div className="w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-700 animate-spin-slow"></div>
          </div>
          {/* Delivery Box */}
          <div className="absolute -top-10 -left-2 w-10 h-10 bg-amber-500 rounded-lg shadow-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
    
    {/* Road line */}
    <div className="absolute bottom-10 left-0 w-full h-1 bg-slate-200/50 overflow-hidden">
      <div className="w-full h-full flex gap-8 animate-road-move">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="h-full w-12 bg-slate-300 shrink-0"></div>
        ))}
      </div>
    </div>

    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes road-move {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-road-move {
        animation: road-move 1s linear infinite;
      }
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .animate-bounce-slow {
        animation: bounce-slow 2s ease-in-out infinite;
      }
      .animate-spin-slow {
        animation: spin 0.5s linear infinite;
      }
    `}} />
  </div>
);

const DonorDashboard: React.FC = () => {
  const [step, setStep] = useState<'IDLE' | 'CAMERA_LOADING' | 'CAMERA' | 'SCANNING' | 'VERIFIED' | 'SUCCESS' | 'PICKUP_PROMPT' | 'POST_LEDGER_OPTIONS' | 'SCHEDULING' | 'SCHEDULED' | 'DROPBOX_LOCATION_INPUT' | 'DROPBOX_MAP' | 'ADDRESS_INPUT' | 'TRACKING' | 'DROP_INSTRUCTION'>('IDLE');
  const [scannedData, setScannedData] = useState<any>(null);
  const [currentDonation, setCurrentDonation] = useState<any>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pincode, setPincode] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [truckPos, setTruckPos] = useState({ lat: 28.6139, lng: 77.2090 }); // Default to a hub
  const [userPos, setUserPos] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi
  const [activeHub, setActiveHub] = useState<any>(null);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { t } = useLanguage();
  const auth = useContext(AuthContext);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auth?.user?.id) return;

    // Listen for donations (deliveries)
    const q = query(
      collection(db, 'deliveries'), 
      where('donorId', '==', auth.user.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format timestamp for display
        timestamp: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      setHistory(docsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deliveries');
    });

    return () => {
      unsubscribe();
      stopCamera();
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, [auth?.user?.id]);

  const handleAddDonation = async () => {
    if (!auth?.user?.id) return;
    try {
      const newDonation = await backendService.addDonation({...scannedData, quantity}, auth.user.id);
      setCurrentDonation(newDonation);
      setStep('PICKUP_PROMPT');
    } catch (err) {
      console.error("Failed to add donation:", err);
    }
  };

  // Critical fix: Bind stream to video element whenever step becomes 'CAMERA'
  useEffect(() => {
    if (step === 'CAMERA' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      
      // Attempt play immediately, handle potential race conditions
      const playVideo = async () => {
        try {
          await video.play();
          console.log("[Camera] Stream active and playing.");
        } catch (err) {
          console.warn("[Camera] Playback delayed or interrupted:", err);
        }
      };
      
      playVideo();
    }
  }, [step]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera access.");
      setStep('IDLE');
      return;
    }

    setError(null);
    setStep('CAMERA_LOADING');
    
    const constraints = [
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: 'environment' } },
      { video: true }
    ];

    let lastError: any = null;

    for (const constraint of constraints) {
      try {
        console.log("[Camera] Attempting with constraints:", constraint);
        // Added a tiny timeout because some browsers fail if called too rapidly
        await new Promise(resolve => setTimeout(resolve, 100));
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        streamRef.current = stream;
        setStep('CAMERA');
        return; // Success!
      } catch (err: any) {
        console.warn("[Camera] Attempt failed:", err.name || err.message);
        lastError = err;
      }
    }

    // If all attempts failed
    console.error("Rapid Camera Error:", lastError);
    
    let userErrorMessage = "Could not start camera. Please refresh and try again.";
    
    if (lastError?.name === 'NotAllowedError' || lastError?.message?.includes('not allowed')) {
      userErrorMessage = "Camera access denied. Please check your browser's site settings and ensure camera permission is granted for this application.";
    } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
      userErrorMessage = "No camera detected. Please connect a camera and try again.";
    } else if (lastError?.name === 'SecurityError') {
      userErrorMessage = "A security error occurred while accessing the camera. This might be due to the application's environment context.";
    }
    
    setError(userErrorMessage);
    setStep('IDLE');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("[Camera] Video dimensions not ready yet.");
        return;
      }

      // Direct sync with video stream dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Optimize quality to 0.7 to reduce payload size while maintaining OCR readability
        processImage(canvas.toDataURL('image/jpeg', 0.7));
      }
    }
  };

  const processImage = async (dataUrl: string) => {
    stopCamera();
    setStep('SCANNING');
    setPreviewImage(dataUrl);
    setError(null);

    try {
      const base64 = dataUrl.split(',')[1];
      const result = await extractMedicineDetails(base64);
      
      if (!result.isReadable) {
        setError(result.reasoning || "Audit Failed. Item rejected.");
        setStep('IDLE');
      } else {
        setScannedData(result);
        setQuantity(result.tabletCount || 1);
        setStep('VERIFIED');
      }
    } catch (err: any) {
      setError(err.message);
      setStep('IDLE');
    }
  };

  const useCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserPos({ lat: latitude, lng: longitude });
          setPickupAddress(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          alert("Could not get location. Please enter manually.");
        }
      );
    } else {
      setIsLocating(false);
      alert("Geolocation not supported.");
    }
  };

  const startTracking = async () => {
    const hubs = [
      { id: 'BNG-04', name: "Central Supply Hub", lat: 12.9716, lng: 77.5946 },
      { id: 'AMD-09', name: "Regional Depot", lat: 23.0225, lng: 72.5714 },
      { id: 'MUM-01', name: "Western Logistics Hub", lat: 19.0760, lng: 72.8777 },
      { id: 'DEL-05', name: "Northern Distribution Center", lat: 28.6139, lng: 77.2090 },
      { id: 'DEL-06', name: "Okhla Logistics Point", lat: 28.5450, lng: 77.2732 },
      { id: 'KOL-03', name: "Eastern Hub", lat: 22.5726, lng: 88.3639 },
      { id: 'CHN-02', name: "Southern Hub", lat: 13.0827, lng: 80.2550 },
      { id: 'HYD-07', name: "Deccan Depot", lat: 17.3850, lng: 78.4867 },
      { id: 'JAM-01', name: "Northern Frontier Hub", lat: 32.7266, lng: 74.8570 },
      { id: 'MP-01', name: "Central India Depot", lat: 23.2599, lng: 77.4126 }
    ];

    // Find nearest hub
    const nearestHub = hubs.reduce((prev, curr) => {
      const prevDist = Math.sqrt(Math.pow(prev.lat - userPos.lat, 2) + Math.pow(prev.lng - userPos.lng, 2));
      const currDist = Math.sqrt(Math.pow(curr.lat - userPos.lat, 2) + Math.pow(curr.lng - userPos.lng, 2));
      return currDist < prevDist ? curr : prev;
    });

    setActiveHub(nearestHub);
    const warehouse = { lat: nearestHub.lat, lng: nearestHub.lng };
    setTruckPos(warehouse);
    
    setIsCalculatingRoute(true);
    setStep('TRACKING');
    
    try {
      // Fetch actual road route using Google Maps grounding
      const waypoints = await getRoadRoute(warehouse, userPos);
      setRoutePath(waypoints);
      setIsCalculatingRoute(false);

      if (waypoints.length < 2) return;

      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);

      let currentWaypoint = 0;
      let progress = 0;
      const speed = 0.002; // Much slower, more realistic speed

      trackingIntervalRef.current = setInterval(() => {
        progress += speed;
        if (progress >= 1) {
          progress = 0;
          currentWaypoint++;
        }

        if (currentWaypoint >= waypoints.length - 1) {
          setTruckPos(userPos);
          if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        } else {
          const start = waypoints[currentWaypoint];
          const end = waypoints[currentWaypoint + 1];
          setTruckPos({
            lat: start.lat + (end.lat - start.lat) * progress,
            lng: start.lng + (end.lng - start.lng) * progress
          });
        }
      }, 50);
    } catch (err) {
      console.error("Failed to start tracking:", err);
      setIsCalculatingRoute(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans">
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-[#f0f4f8] p-10 rounded-[3rem] shadow-2xl border border-[#cbd5e0] min-h-[600px] flex flex-col relative overflow-hidden transition-all duration-500">
            <div className="mb-8 flex justify-between items-center border-b border-[#cbd5e0] pb-6">
              <div>
                <h2 className="text-3xl font-black text-[#2d3748] tracking-tighter">{t('donor.db.title')}</h2>
                <p className="text-sm font-bold text-[#4a5568] mt-1">{t('donor.db.subtitle')}</p>
              </div>
              {step !== 'IDLE' && (
                <button onClick={() => { stopCamera(); setStep('IDLE'); }} className="text-[#a0aec0] hover:text-red-500 font-bold text-xs transition-colors flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('donor.db.reset')}
                </button>
              )}
            </div>

            <div className="flex-grow flex flex-col justify-center">
              {error && (
                <div className="mb-6 p-5 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-4 animate-bounce">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  {error}
                </div>
              )}

              {step === 'IDLE' && (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300">
                  <button onClick={startCamera} className="p-16 border-4 border-dashed border-[#cbd5e0] rounded-[3rem] bg-white hover:bg-[#e2e8f0] hover:border-[#4a5568] transition-all flex flex-col items-center group">
                    <div className="w-24 h-24 bg-[#4a5568] rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition shadow-2xl">
                      <Camera className="w-12 h-12" />
                    </div>
                    <span className="font-bold text-sm text-[#2d3748]">{t('donor.db.scan')}</span>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-16 border-4 border-dashed border-[#cbd5e0] rounded-[3rem] bg-white hover:bg-[#e2e8f0] hover:border-[#4a5568] transition-all flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white border-2 border-[#cbd5e0] rounded-3xl flex items-center justify-center text-[#4a5568] mb-6 group-hover:scale-110 transition shadow-xl">
                      <Upload className="w-12 h-12" />
                    </div>
                    <span className="font-bold text-sm text-[#2d3748]">{t('donor.db.upload')}</span>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => processImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} className="hidden" accept="image/*" />
                  </button>
                </div>
              )}

              {step === 'CAMERA_LOADING' && (
                <div className="flex flex-col items-center justify-center h-[450px] bg-[#2d3748] rounded-[3rem] shadow-inner animate-in fade-in duration-200">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-white text-lg font-bold">{t('donor.db.launching')}</h3>
                  <p className="text-sky-300 text-xs font-medium mt-2 mb-8">{t('donor.db.syncing')}</p>
                  <p className="text-[#718096] text-[10px] font-bold max-w-xs text-center px-10 leading-relaxed font-sans">
                    If camera doesn't start, try opening the app in a new tab or check browser permissions.
                  </p>
                </div>
              )}

              {step === 'CAMERA' && (
                <div className="relative rounded-[3rem] overflow-hidden bg-black h-[450px] shadow-3xl border-8 border-slate-900 animate-in fade-in duration-500">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                  
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center z-30">
                    <button 
                      onClick={capturePhoto} 
                      className="group w-20 h-20 bg-white rounded-full border-8 border-indigo-600 shadow-3xl active:scale-90 transition-all flex items-center justify-center"
                    >
                      <div className="w-12 h-12 bg-indigo-100 rounded-full border-4 border-indigo-50"></div>
                    </button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {step === 'SCANNING' && (
                <div className="text-center py-20 animate-in fade-in duration-300">
                  <div className="relative w-24 h-24 mx-auto mb-10">
                    <div className="absolute inset-0 border-8 border-sky-50 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-3xl font-bold tracking-tighter">{t('donor.db.analyzing')}</h3>
                  <p className="text-[#4a5568] font-bold text-sm mt-4">{t('donor.db.consulting')}</p>
                </div>
              )}

              {step === 'VERIFIED' && scannedData && (
                <div className="animate-in slide-in-from-bottom-8 duration-500">
                  <div className="flex flex-col md:flex-row gap-10 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 mb-10 shadow-inner">
                    <div className="relative shrink-0 mx-auto md:mx-0">
                      <div className="relative w-40 h-56 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                        <img src={previewImage!} className="w-full h-full object-cover" alt="Scan Result" />
                        
                        {/* Count Label in Bottom Left - Kept as requested */}
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[8px] font-bold border border-white/10">
                          {(scannedData.tabletCount || 0) + ' ' + t('donor.db.tabletsIdentified')}
                        </div>
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-2 rounded-xl shadow-lg z-10">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                      </div>
                    </div>
                    <div className="flex-grow space-y-6 text-center md:text-left">
                      <h3 className="text-4xl font-black tracking-tighter text-slate-900 leading-[1.0]">{scannedData.name}</h3>
                      <div className="grid grid-cols-1 gap-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">{t('donor.db.expiry')}</p>
                          <p className="font-black text-2xl text-emerald-600">{scannedData.expiryDate}</p>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-200">
                         <div className="flex justify-between items-center mb-3 px-2">
                           <p className="text-xs font-bold text-slate-400">{t('donor.db.confirmCount')}</p>
                         </div>
                         <div className="relative">
                           <input 
                             type="number" 
                             value={quantity} 
                             onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))} 
                             className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-2xl outline-none focus:border-indigo-600 transition-all text-center text-black" 
                           />
                           <p className="text-center mt-2 text-xs font-bold text-slate-400">{t('donor.db.correctQuantity')}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { setStep('IDLE'); startCamera(); }}
                      className="py-6 bg-white border-2 border-slate-200 text-slate-600 rounded-[2rem] font-bold hover:bg-slate-50 transition-all text-lg"
                    >
                      {t('donor.db.scanAgain')}
                    </button>
                    <button 
                      onClick={handleAddDonation} 
                      className="py-6 bg-[#2d3748] text-white rounded-[2rem] font-bold shadow-2xl hover:bg-emerald-600 transition-all text-lg transform hover:-translate-y-1 active:scale-95"
                    >
                      {t('donor.db.addToLedger')}
                    </button>
                  </div>
                </div>
              )}

              {step === 'PICKUP_PROMPT' && (
                <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <Truck className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">{t('donor.db.schedulePickup')}</h3>
                  <p className="text-slate-500 font-bold text-sm mt-4 max-w-xs mx-auto">{t('donor.db.logisticsReady')}</p>
                  
                  <div className="grid grid-cols-1 gap-4 mt-10">
                    <button 
                      onClick={() => setStep('ADDRESS_INPUT')} 
                      className="py-6 bg-indigo-600 text-white rounded-[2rem] font-bold shadow-2xl hover:bg-indigo-700 transition-all text-lg flex items-center justify-center gap-3"
                    >
                      <Truck className="w-6 h-6" />
                      {t('donor.db.yesSchedule')}
                    </button>
                    <button 
                      onClick={() => setStep('DROP_INSTRUCTION')}
                      className="py-6 bg-emerald-600 text-white rounded-[2rem] font-bold shadow-2xl hover:bg-emerald-700 transition-all text-lg flex items-center justify-center gap-3"
                    >
                      <MapPin className="w-6 h-6" />
                      {t('donor.db.dropNearby')}
                    </button>
                    <button 
                      onClick={() => setStep('POST_LEDGER_OPTIONS')}
                      className="py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                      {t('donor.db.maybeLater')}
                    </button>
                  </div>
                </div>
              )}

              {step === 'ADDRESS_INPUT' && (
                <div className="py-10 animate-in slide-in-from-bottom-8 duration-500">
                  <h3 className="text-3xl font-black tracking-tighter text-slate-900 mb-8 text-center">{t('donor.db.pickupAddress')}</h3>
                  
                  <div className="space-y-6">
                    <div className="relative">
                      <textarea 
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder={t('donor.db.enterAddress')}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-lg outline-none focus:border-indigo-600 transition-all h-32 resize-none text-black placeholder:text-slate-500"
                      />
                    </div>
                    
                    <button 
                      onClick={useCurrentLocation}
                      disabled={isLocating}
                      className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                      {isLocating ? t('donor.db.locating') : t('donor.db.useLocation')}
                    </button>

                    <div className="pt-6 border-t border-slate-100">
                      <button 
                        disabled={!pickupAddress}
                        onClick={() => {
                          setStep('SCHEDULING');
                          setTimeout(() => setStep('SCHEDULED'), 3000);
                        }}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-bold shadow-2xl hover:bg-black transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('donor.db.confirmSchedule')}
                      </button>
                      <button 
                        onClick={() => setStep('PICKUP_PROMPT')}
                        className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors mt-2"
                      >
                        {t('donor.db.back')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'POST_LEDGER_OPTIONS' && (
                <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter text-slate-900">Added to ledger</h3>
                  <p className="text-slate-500 font-bold text-sm mt-2">Your donation is verified and recorded.</p>
                  <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 max-w-sm mx-auto">
                    <p className="text-emerald-700 text-xs font-bold font-sans">
                      Our system is now identifying potential recipients who could benefit from the medicines you kindly donated.
                    </p>
                  </div>
                  
                  <div className="space-y-4 mt-10">
                    <button 
                      onClick={() => {
                        setStep('SCHEDULING');
                        setTimeout(() => setStep('SCHEDULED'), 3000);
                      }}
                      className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-bold shadow-xl hover:bg-indigo-700 transition-all text-lg flex items-center justify-center gap-3"
                    >
                      <Truck className="w-6 h-6" />
                      Schedule delivery now
                    </button>
                    <button 
                      onClick={() => setStep('DROPBOX_LOCATION_INPUT')}
                      className="w-full py-6 bg-white border-2 border-slate-200 text-slate-600 rounded-[2rem] font-bold hover:bg-slate-50 transition-all text-lg flex items-center justify-center gap-3"
                    >
                      <MapPin className="w-6 h-6" />
                      Find dropboxes near you
                    </button>
                    <button 
                      onClick={() => setStep('IDLE')}
                      className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                      Go back to dashboard
                    </button>
                  </div>
                </div>
              )}

              {step === 'SCHEDULING' && (
                <div className="text-center py-10 animate-in fade-in duration-500">
                  <ScooterAnimation />
                  <h3 className="text-3xl font-black tracking-tighter text-slate-900">{t('donor.db.assigning')}</h3>
                  <p className="text-slate-500 font-bold text-sm mt-2">{t('donor.db.findingRider')}</p>
                </div>
              )}

              {step === 'SCHEDULED' && (
                <div className="text-center py-10 animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl shadow-emerald-100">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">Delivery Scheduled</h3>
                  <p className="text-slate-500 font-bold text-sm mt-4 font-sans">Will reach your location in 15 minutes, will give you a call</p>
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-2">Identifying potential recipients for your donation...</p>
                  
                  <div className="mt-8 p-10 bg-indigo-50 rounded-[3rem] border border-indigo-100 inline-block min-w-[320px]">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 font-sans">Receipt Number / OTP</p>
                    <div className="text-6xl font-black text-indigo-600 tracking-wider font-mono mb-6">3671</div>
                    <p className="text-xs font-bold text-indigo-500 font-sans leading-relaxed">Please give this number to the rider upon arrival.</p>
                    <div className="h-px bg-indigo-200/30 my-6 w-full" />
                    <p className="text-base font-black text-slate-700 font-sans">Thank you for your donation!</p>
                  </div>
                  
                  <div className="mt-12">
                    <button 
                      onClick={() => setStep('IDLE')}
                      className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mx-auto"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}

              {step === 'DROP_INSTRUCTION' && (
                <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-sky-100 text-sky-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <MapPin className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">Search Nearby</h3>
                  <p className="text-slate-500 font-bold text-lg mt-4 max-w-xs mx-auto">Go to homepage to search nearby</p>
                  
                  <div className="mt-10">
                    <button 
                      onClick={() => setStep('IDLE')}
                      className="py-6 px-12 bg-slate-900 text-white rounded-[2rem] font-bold shadow-2xl hover:bg-black transition-all text-lg"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}

              {step === 'TRACKING' && (
                <div className="flex flex-col h-[550px] animate-in slide-in-from-right-8 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter text-slate-900">{t('donor.db.liveTracking')}</h3>
                      <p className="text-xs font-bold text-slate-400">{t('donor.db.truckFrom')} {activeHub?.name || 'Nearest Hub'}</p>
                    </div>
                    <button onClick={() => setStep('IDLE')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="flex-grow rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                    <LiveMap 
                      truckPos={truckPos} 
                      userPos={userPos} 
                      routePath={routePath} 
                      activeHub={activeHub}
                      showOnlyTracking={true}
                      height="h-full" 
                    />
                    
                    {isCalculatingRoute && (
                      <div className="absolute inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('donor.db.calculatingRoute')}</p>
                          <p className="text-[10px] font-bold text-slate-400">{t('donor.db.consultingMaps')}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg z-[1000]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('donor.db.riderEnRoute')}</span>
                      </div>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 bg-slate-900 text-white p-6 rounded-2xl shadow-2xl z-[1000]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                          <Truck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('donor.db.estArrival')}</p>
                          <p className="text-xl font-black">12 Minutes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('donor.db.status')}</p>
                          <p className="text-sm font-bold text-emerald-400">{t('donor.db.onTime')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'DROPBOX_LOCATION_INPUT' && (
                <div className="py-10 animate-in slide-in-from-bottom-8 duration-500">
                  <h3 className="text-3xl font-black tracking-tighter text-slate-900 mb-8 text-center">{t('donor.db.findDropboxes')}</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder={t('donor.db.enterPincode')}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg outline-none focus:border-emerald-600 transition-all text-black placeholder:text-slate-500"
                        />
                      </div>
                      
                      <button 
                        onClick={useCurrentLocation}
                        disabled={isLocating}
                        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                        {isLocating ? t('donor.db.locating') : t('donor.db.useLocation')}
                      </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <button 
                        disabled={!pincode && !pickupAddress}
                        onClick={() => setStep('DROPBOX_MAP')}
                        className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-bold shadow-2xl hover:bg-emerald-700 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('donor.db.showNearby')}
                      </button>
                      <button 
                        onClick={() => setStep('PICKUP_PROMPT')}
                        className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors mt-2"
                      >
                        {t('donor.db.back')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'DROPBOX_MAP' && (
                <div className="flex flex-col h-[550px] animate-in slide-in-from-right-8 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black tracking-tighter text-slate-900">{t('donor.db.findDropboxes')}</h3>
                    <button onClick={() => setStep('POST_LEDGER_OPTIONS')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder={t('donor.db.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="flex-grow rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                    <LiveMap userPos={userPos} onlyDropboxes={true} height="h-full" />
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl z-[1000]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('donor.db.activeDropboxes')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'SUCCESS' && (
                <div className="text-center py-20 animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl shadow-emerald-100">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl font-bold tracking-tighter">Ledger sync complete</h3>
                  <p className="text-slate-400 font-bold text-sm mt-3">Distribution logistics triggered</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-[#2d3748] p-10 rounded-[3rem] text-white shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-sky-500/30"></div>
             <h3 className="text-sm font-bold text-sky-300 mb-10 flex items-center gap-2">
               <Activity className="w-4 h-4" />
               {t('donor.db.gridIntel')}
             </h3>
             <div className="space-y-10">
                <div>
                   <div className="text-6xl font-black tracking-tighter">{history.length}</div>
                   <div className="text-xs font-bold text-slate-400 mt-2">{t('donor.db.saved')}</div>
                </div>
                <div className="p-6 bg-white/5 rounded-[1.5rem] border border-white/10">
                   <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs font-bold text-emerald-400">{t('donor.db.engineActive')}</span>
                   </div>
                   <p className="text-xs font-medium text-slate-300 leading-relaxed">
                     {t('donor.db.engineOnline')}
                   </p>
                </div>
             </div>
          </div>
          
          <div className="bg-white p-8 rounded-[3rem] border border-[#cbd5e0] shadow-xl space-y-6">
             <h3 className="text-xs font-bold text-[#4a5568] mb-4 flex items-center gap-2">
               <History className="w-4 h-4" />
               Recent Network Events
             </h3>
             <div className="space-y-4">
                {history.slice(-4).reverse().map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#f7fafc] border border-transparent hover:border-[#cbd5e0] transition">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 font-bold text-sm shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                         <p className="font-bold text-[#2d3748] text-sm truncate">{item.name}</p>
                         <p className="text-[10px] font-medium text-[#718096] mt-0.5">Verified ledger entry</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedHistoryItem(item)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap px-2 py-1 bg-indigo-50 rounded-lg"
                    >
                      E-Reports
                    </button>
                  </div>
                ))}
                {history.length === 0 && (
                   <div className="text-center py-8 opacity-40">
                      <p className="text-xs font-bold text-[#a0aec0]">Awaiting initial audit</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Donation Details Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-3xl relative animate-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute -top-4 -right-4 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] shadow-2xl group border-4 border-white"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <div className="p-10">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">Donation Receipt</h3>
              <p className="text-sm font-bold text-slate-400 mb-8">Transaction ID: {selectedHistoryItem.receiptNumber}</p>
              
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Item Details</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-xl text-slate-900">{selectedHistoryItem.name}</p>
                      <p className="text-xs font-bold text-slate-500">{selectedHistoryItem.strength}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-indigo-600">{selectedHistoryItem.quantity}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Units</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Impact Report</p>
                  <p className="font-bold text-slate-700 leading-relaxed mb-4">
                    {selectedHistoryItem.impactMessage || "Our clinical algorithms are currently identifying potential recipients who could benefit from these specific medicines."}
                  </p>
                  <div className="mt-4 pt-4 border-t border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Message from Recipient</p>
                    <p className="italic font-medium text-indigo-600">
                      "{selectedHistoryItem.thankYouMessage || "nice message thankyou"}"
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
