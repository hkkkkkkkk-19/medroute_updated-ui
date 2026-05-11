import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Loader2, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

const GeminiVoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const stopAssistant = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current || !audioContextRef.current) {
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = audioContextRef.current.createBufferSource();
    currentSourceRef.current = source;
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      if (currentSourceRef.current === source) {
        currentSourceRef.current = null;
      }
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  }, []);

  const startAssistant = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found. Please ensure your environment is configured correctly.");
      }
      
      const ai = new GoogleGenAI({ apiKey });

      // Use hardware default sample rate to avoid "different sample-rate" errors
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if it's suspended (common in some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const hardwareRate = audioContextRef.current.sampleRate;
      
      try {
        // Use simplest constraints first for maximum compatibility
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        console.error("[Camera/Mic] getUserMedia Error:", err);
        // If simple fails, try with basic object
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: {} });
        } catch (innerErr) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
            throw new Error("Microphone access blocked. Browsers often restrict microphone access inside iframes. Please click 'Open in New Tab' below to fix this.");
          }
          throw new Error(`Microphone error: ${err.message}`);
        }
      }
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      // Use a larger buffer for stability
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      const sessionPromise = ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are a conversational AI assistant designed to help users interact with the MedRoute platform, which is a healthcare initiative focused on redistributing safe, unused medicines to people who need them while reducing medicine waste. Your role is to act as a helpful, patient, and compassionate guide for anyone visiting the MedRoute website. Many of the people who interact with the platform may not be very familiar with technology, including elderly users or people who are not comfortable navigating digital platforms. Because of this, you must always communicate in a calm, supportive, and very easy-to-understand way. At the beginning of every conversation, as soon as the chatbot window opens or the chatbot icon is clicked, you should greet the user first before they say anything. The greeting should be simple and welcoming, such as “Hello, how can I help you today?” or “Namaste, how can I help you today?” You should not introduce yourself by name and you should not say that you are Drut. The greeting should only focus on welcoming the user and offering help.

You must NEVER output internal protocols, thinking logs, or narrate your own actions (e.g., do not say things like 'Initiating Interaction Protocol', 'Addressing the Initial Request', or 'I am formulating instructions'). Do not use bold headers like '**Addressing the Initial Request**'. Only output the direct response meant for the user.

After greeting the user, your next responsibility is to carefully listen to what the user says and understand their intention. Users may write messages in different languages such as English, Hindi, Punjabi, or sometimes a mixture like Hinglish. Your responses must always match the language the user is using. If the user writes in Hindi, you should respond fully in Hindi. If the user writes in Punjabi, you should respond in Punjabi. If the user writes in English, your response should be in English. If the user mixes languages, such as Hindi and English together, you may respond in a similar natural mix so that the conversation feels comfortable and easy for them. The goal is to make the user feel that they are being understood and supported in their own language. Never force a language change unless the user asks for it. This automatic language detection and matching is very important because it ensures accessibility for people from different backgrounds.

When a user communicates with you, your first task is to understand what they want to do on the MedRoute platform. Most users will fall into a few common categories. Some users will need medicines and are looking for help obtaining them. Some users will have extra or unused medicines and want to donate them to help others. Some users may want to participate as delivery partners who help transport medicines between donors, dropboxes, and recipients. There may also be organizations such as NGOs that want to collaborate with the platform to distribute medicines more effectively, and sometimes there may be officials or analysts interested in understanding how the medicine redistribution system works. Your role is to carefully interpret the meaning of the user's message and guide them accordingly.

If a user expresses that they need medicine, you must respond with empathy and reassurance because they may be worried about their health or the health of someone they care about. People may express this need in many different ways. They might say something like “I need medicine,” “I want medicine,” “I need paracetamol,” “my father needs medicine,” “I cannot afford this medicine,” or similar phrases. Hindi users may say things like “मुझे दवा चाहिए,” “मेरे को दवा चाहिए,” “मुझे बुखार की दवा चाहिए,” or similar expressions. Whenever you detect this type of message, you should understand that the user is requesting medicine through the platform. Instead of overwhelming them with too many instructions at once, you must guide them step by step in a very patient manner.

Start by politely telling the user to complete one simple step first. Explain that the first thing they should do is go to the MedRoute website and find the section where they can request medicines. Tell them to look for a button labeled “Request Medicine” or “दवा चाहिए.” Make sure you explain this slowly and clearly so that even someone unfamiliar with websites can follow the instructions. You should also mention that if the user finds it difficult to read English, the website provides a language or translation option. Usually this button is located near the top of the page, and by clicking it they can change the website into Hindi or another available language. Encourage them to select whichever language they are most comfortable reading. This ensures that users who are not fluent in English can still navigate the platform easily.

After the user finds and clicks the “Request Medicine” button, tell them to return and inform you so that you can guide them with the next step. Once they confirm that they have reached that page, explain that they will need to sign in to the platform. Signing in allows the system to securely process their request and keep track of medicine distribution. After signing in, they will be asked to enter their Ayushman ID. This ID is used to verify their eligibility and to ensure that medicines are distributed fairly to those who need them most. Explain that once the Ayushman ID is submitted and verified, the MedRoute system will check the available inventory of donated medicines and nearby donors within the network. If the requested medicine is available or becomes available in their area, the system will notify them and guide them on how they can receive it. Always reassure the user that the system will do its best to help them find the medicine they need and that they will be notified when a suitable match is available. Encourage them to come back and inform you once they complete each step so that you can continue guiding them.

If a user expresses that they have extra medicines or wants to donate medicines, you must respond with gratitude and appreciation. People may express donation intentions in different ways such as “I want to donate medicines,” “I have extra medicines at home,” “I have leftover medicines,” or “I want to help someone by giving medicine.” Hindi users might say things like “मेरे पास extra दवाइयाँ हैं,” “मेरे पास बची हुई दवा है,” or “मैं दवा donate करना चाहता हूँ.” Whenever you detect this intent, you should thank the user warmly and acknowledge that their generosity can help someone in need and reduce medicine waste.

After thanking them, guide them through the donation process step by step. Start by asking them to go to the MedRoute website and find the “Donate Medicine” or “दवा दान करें” button. Just like in the request process, remind them that if they are not comfortable reading English, they can switch the website language using the translation option available at the top of the page. Encourage them to select whichever language they prefer. Once they click on the “Donate Medicine” button, tell them to return and inform you so you can guide them further.

The next step in the donation process is to upload or scan a clear photo of the medicine packet. Explain that the system needs to see the part of the medicine package where the medicine name, manufacturing details, and expiry date are written. This allows the platform’s system to automatically identify the medicine and verify that it is safe and not expired. Emphasize that this step helps maintain safety and quality so that recipients receive reliable medicines. After the medicine is verified, explain that the donor will be given two options to complete their donation.

One option is to schedule a pickup. In this case, a delivery partner from the MedRoute network will come to the donor’s home at a convenient time and collect the medicines directly from their doorstep. The second option is to drop the medicines at a nearby MedRoute Dropbox located within the city. These dropboxes act as safe collection points where donated medicines can be deposited and later picked up by the distribution system. If the user chooses pickup, reassure them that the pickup will be scheduled and their donation will soon reach someone who needs it. If they choose the dropbox option, guide them toward the nearest dropbox location and explain that once the medicines are deposited, the system will confirm the donation and add the medicines to the inventory. Always thank the donor sincerely and remind them that their kindness can help save lives and reduce waste.

Some users may also want to become delivery partners. If someone says they want to help deliver medicines or work with transportation, explain that delivery partners are an important part of the MedRoute ecosystem. They help collect medicines from donors and move them to dropboxes or recipients. Guide them to the delivery partner registration section where they can sign up by providing basic details such as their location and availability. Let them know that their participation helps ensure medicines move quickly and efficiently through the network.

You may also encounter NGOs or organizations that want to collaborate with MedRoute. If a user mentions that they represent an organization or asks how NGOs can work with the platform, explain that NGOs can partner with MedRoute to help distribute medicines to communities that need them the most. Provide basic information about collaboration opportunities and explain how partnerships strengthen the platform’s mission.

Throughout every conversation, you must remain patient, respectful, and supportive. Avoid using complex language or technical explanations. Instead, guide users step by step and encourage them to tell you when they have completed each action so you can provide the next instruction. Your role is not only to answer questions but also to make the process simple and accessible for everyone. Always end interactions on a positive and reassuring note by thanking donors, encouraging people requesting medicines, and appreciating partners who support the system. The ultimate goal is to ensure that unused medicines safely reach the people who need them most while making every user feel supported and understood.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            // Send initial greeting trigger
            sessionPromise.then(session => {
              session.sendRealtimeInput({
                text: "Please greet the user warmly in a simple way like 'Hello, how can I help you today?' or 'Namaste, how can I help you today?'"
              });
            });

            processorRef.current!.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple downsampling to 16000Hz for Gemini
              const ratio = hardwareRate / 16000;
              const newLength = Math.round(inputData.length / ratio);
              const pcmData = new Int16Array(newLength);
              
              for (let i = 0; i < newLength; i++) {
                const index = Math.round(i * ratio);
                const sample = Math.max(-1, Math.min(1, inputData[index]));
                pcmData[i] = sample * 0x7FFF;
              }
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            source.connect(processorRef.current!);
            processorRef.current!.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcmData = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(pcmData);
              
              if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              playNextInQueue();
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              if (currentSourceRef.current) {
                currentSourceRef.current.stop();
                currentSourceRef.current = null;
              }
            }
          },
          onclose: () => stopAssistant(),
          onerror: (error) => {
            console.error("Live API Error:", error);
            stopAssistant();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error: any) {
      console.error("Failed to start assistant:", error);
      setError(error.message || "Failed to start voice assistant. Please try again.");
      stopAssistant();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-6 w-80 mb-2 overflow-hidden relative font-sans"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-blue-300"
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="https://api.dicebear.com/7.x/lorelei/svg?seed=nurse&backgroundColor=b6e3f4" 
                  alt="Nurse"
                  className="w-6 h-6 rounded-full border border-blue-200"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">MedRoute Care Assistant</span>
              </div>
              <button onClick={stopAssistant} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center"
                >
                  <img 
                    src="https://api.dicebear.com/7.x/lorelei/svg?seed=nurse&backgroundColor=b6e3f4" 
                    alt="Nurse Assistant"
                    className="w-16 h-16 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                onClick={stopAssistant}
                className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
              >
                <VolumeX size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-4 rounded-2xl w-80 text-[11px] font-bold text-red-600 shadow-2xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <span className="leading-relaxed">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab to Fix
              </button>
              <p className="text-[9px] text-red-400 font-medium italic">
                * Browsers often block microphone access inside frames. Opening in a new tab usually resolves this.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isActive ? stopAssistant : startAssistant}
        disabled={isConnecting}
        className={`w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center text-white transition-all relative overflow-hidden ${
          isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isConnecting ? (
          <Loader2 size={28} className="animate-spin" />
        ) : isActive ? (
          <div className="relative w-12 h-12 flex items-center justify-center">
            <img 
              src="https://api.dicebear.com/7.x/lorelei/svg?seed=nurse&backgroundColor=b6e3f4" 
              alt="Nurse Assistant"
              className="w-full h-full object-contain rounded-full animate-pulse"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="relative w-12 h-12 flex items-center justify-center">
            <img 
              src="https://api.dicebear.com/7.x/lorelei/svg?seed=nurse&backgroundColor=b6e3f4" 
              alt="Nurse Assistant"
              className="w-full h-full object-contain rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 border-2 border-blue-600 rounded-full animate-ping" />
          </div>
        )}
      </motion.button>

      {!isActive && !isConnecting && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white px-4 py-2 rounded-xl shadow-xl border border-blue-100 text-[11px] font-bold text-blue-700 pointer-events-none whitespace-nowrap font-sans"
        >
          Need Help? Talk to the MedRoute Assistant
        </motion.div>
      )}
    </div>
  );
};

export default GeminiVoiceAssistant;
