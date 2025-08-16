import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Save, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { VoiceNote } from "@/types/VoiceNote";
import "@/types/VoiceNote"; // Import speech recognition types

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  useEffect(() => {
    // Monitor network status
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (isRecording) {
        stopRecording();
        toast.error("Lost internet connection. Recording stopped.");
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isRecording]);

  useEffect(() => {
    // Check if speech recognition is supported
    console.log('Speech Recognition support check:', {
      hasSpeechRecognition: 'SpeechRecognition' in window,
      hasWebkitSpeechRecognition: 'webkitSpeechRecognition' in window,
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext
    });
    
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      toast.error("Speech recognition requires Chrome, Edge, or Safari. On mobile, please use Chrome or Safari browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setNetworkError(false);
      toast.success("Recording started - speak clearly");
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription(prev => prev + finalTranscript);
      }
      
      setCurrentTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setNetworkError(true);
      
      if (event.error === 'network') {
        toast.error("Network error: Please check your internet connection and try again.");
      } else if (event.error === 'no-speech') {
        toast.error("No speech detected. Please speak louder or closer to the microphone.");
      } else if (event.error === 'audio-capture') {
        toast.error("Microphone not accessible. Please check permissions.");
      } else if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone permission.");
      } else {
        toast.error(`Recording error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setCurrentTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);


  const startRecording = () => {
    if (!isOnline) {
      toast.error("No internet connection. Speech recognition requires an active internet connection.");
      return;
    }

    if (recognitionRef.current && !isRecording) {
      setTranscription("");
      setCurrentTranscript("");
      setSummary("");
      setNetworkError(false);
      
      // Request microphone permission explicitly on mobile
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            recognitionRef.current?.start();
          })
          .catch((error) => {
            console.error('Microphone permission denied:', error);
            toast.error("Microphone access is required. Please allow microphone permission and try again.");
          });
      } else {
        recognitionRef.current.start();
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };


  const generateSummary = (text: string): string => {
    if (text.length < 50) return "";
    
    // Simple AI-like summary generation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= 2) return "";
    
    // Take every other sentence or key sentences (simple heuristic)
    const keySentences = sentences.filter((_, index) => index % 2 === 0 || sentences[index]?.includes('important') || sentences[index]?.includes('action'));
    
    return keySentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n');
  };

  const saveNote = () => {
    if (!transcription.trim()) {
      toast.error("No transcription to save");
      return;
    }

    setIsProcessing(true);
    
    // Generate summary
    const noteSummary = generateSummary(transcription);
    
    const note: VoiceNote = {
      id: Date.now().toString(),
      title: `Note - ${new Date().toLocaleString()}`,
      transcription: transcription.trim(),
      summary: noteSummary || undefined,
      tags: [],
      timestamp: new Date(),
    };

    // Save to localStorage
    const existingNotes = JSON.parse(localStorage.getItem('rhei-voice-notes') || '[]');
    const updatedNotes = [note, ...existingNotes];
    localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));

    setIsProcessing(false);
    
    toast.success("Note saved successfully!");
    
    // Reset for next recording
    setTimeout(() => {
      setTranscription("");
      setSummary("");
    }, 2000);
  };

  const displayText = transcription + currentTranscript;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Recording Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className={`record-button ${isRecording ? 'recording' : 'inactive'} w-32 h-32 rounded-full text-white font-semibold text-lg shadow-lg`}
            style={{
              backgroundColor: isRecording ? 'hsl(var(--recording-active))' : 'hsl(var(--rhei-primary))',
            }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <>
                <MicOff className="w-8 h-8 mb-2" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 mb-2" />
                <span>Record</span>
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-rhei-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">
              {isOnline ? "Connected" : "No Internet"}
            </span>
          </div>
          
          <p className="text-lg font-medium">
            {isRecording ? (
              <span className="text-recording-active">🔴 Recording...</span>
            ) : transcription ? (
              <span className="text-rhei-success">✅ Recording complete</span>
            ) : networkError ? (
              <span className="text-destructive">❌ Network error - check connection</span>
            ) : !isOnline ? (
              <span className="text-destructive">📶 Internet required for recording</span>
            ) : (
              <span className="text-muted-foreground">Click to start recording</span>
            )}
          </p>
        </div>

        {/* Live Transcription */}
        {displayText && (
          <Card className="note-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Live Transcription</h3>
                  <Textarea
                    value={displayText}
                    onChange={(e) => setTranscription(e.target.value)}
                    placeholder="Your transcription will appear here..."
                    className="min-h-32 fade-in"
                    readOnly={isRecording}
                  />
                </div>


                {summary && (
                  <div>
                    <h4 className="font-medium mb-2">AI Summary</h4>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
                    </div>
                  </div>
                )}

                {transcription && !isRecording && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveNote} 
                      disabled={isProcessing}
                      className="flex items-center space-x-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isProcessing ? "Saving..." : "Save Note"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">How to use:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Internet required:</strong> Voice recognition needs active connection</li>
              <li>• Click the record button to start voice recording</li>
              <li>• Allow microphone access when prompted</li>
              <li>• Speak clearly - transcription appears in real-time</li>
              <li>• On mobile: Use Chrome or Safari browser for best results</li>
              <li>• If network errors occur, check your connection and try again</li>
              <li>• Recording continues until you click stop</li>
              <li>• Edit transcription if needed, then save your note</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceRecorder;