import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Wifi, WifiOff, Loader2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceNote } from '@/types/VoiceNote';
import { supabase } from '@/integrations/supabase/client';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [enhancement, setEnhancement] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(false);
      toast.success("Connection restored");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError(true);
      toast.error("Connection lost");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(audioBlob);
        
        // Create audio URL for playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Clear duration timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        
        // Process the audio
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
      
      // Clear previous results
      setTranscription('');
      setEnhancement(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);
      
      toast.success("Recording started - speak clearly");
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error("Failed to access microphone. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!isOnline) {
      toast.error("No internet connection - cannot process audio");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Convert audio to base64 and transcribe
      setProcessingStage("Converting audio...");
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 using FileReader to avoid call stack issues
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (data:audio/webm;base64,)
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      setProcessingStage("Transcribing with AI...");
      const transcribeResponse = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (transcribeResponse.error) {
        throw new Error(transcribeResponse.error.message);
      }

      const transcriptionText = transcribeResponse.data.text;
      setTranscription(transcriptionText);
      
      // Step 2: Enhance with AI
      setProcessingStage("Generating insights...");
      const enhanceResponse = await supabase.functions.invoke('enhance-note', {
        body: { transcription: transcriptionText }
      });

      if (enhanceResponse.error) {
        throw new Error(enhanceResponse.error.message);
      }

      setEnhancement(enhanceResponse.data);
      console.log('✅ Processing complete - transcription:', transcriptionText, 'enhancement:', enhanceResponse.data);
      toast.success("Voice note processed successfully!");
      
    } catch (error) {
      console.error('Audio processing error:', error);
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const saveNote = () => {
    if (!transcription.trim()) {
      toast.error("No transcription to save");
      return;
    }

    const note: VoiceNote = {
      id: crypto.randomUUID(),
      title: enhancement?.title || `Voice Note ${new Date().toLocaleDateString()}`,
      transcription: transcription.trim(),
      summary: enhancement?.summary || '',
      tags: enhancement?.keyTopics || [],
      timestamp: new Date(),
    };

    // Get existing notes from localStorage
    const existingNotes = JSON.parse(localStorage.getItem('rhei-voice-notes') || '[]');
    
    // Add new note
    const updatedNotes = [note, ...existingNotes];
    
    // Save to localStorage
    localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));
    console.log('Saved note to localStorage:', note); // Debug log
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('rhei-note-saved', { detail: note }));

    // Reset state
    setTranscription('');
    setEnhancement(null);
    setAudioBlob(null);
    setRecordingDuration(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    toast.success("Voice note saved successfully!");
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            AI Voice Notes
          </CardTitle>
          <CardDescription>
            Record your voice and get AI-powered transcription and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
              
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? `Recording ${formatDuration(recordingDuration)}` : 'Ready'}
              </Badge>
            </div>

            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="h-24 w-24 rounded-full"
              disabled={networkError || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            <p className="text-center text-muted-foreground max-w-md">
              {isProcessing 
                ? processingStage || "Processing..." 
                : isRecording 
                  ? "Recording... Click to stop and process with AI" 
                  : "Click the microphone to start recording your voice note"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {audioUrl && !isRecording && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={togglePlayback}
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Recording ({formatDuration(recordingDuration)})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {transcription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Transcription</CardTitle>
            {/* Debug info */}
            <div className="text-xs text-muted-foreground">
              Debug: transcription length = {transcription.length}, content = "{transcription.substring(0, 50)}..."
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Your transcription will appear here..."
                className="min-h-[200px] resize-none"
                disabled={isProcessing}
              />

              {enhancement && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium mb-3">AI Analysis</h4>
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div>
                        <span className="text-sm font-medium">Suggested Title:</span>
                        <p className="text-sm mt-1 font-semibold">{enhancement.title}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium">Summary:</span>
                        <p className="text-sm mt-1">{enhancement.summary}</p>
                      </div>
                      
                      {enhancement.actionItems?.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Action Items:</span>
                          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                            {enhancement.actionItems.map((item: string, index: number) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {enhancement.keyTopics?.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Key Topics:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {enhancement.keyTopics.map((topic: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {enhancement.sentiment && (
                        <div>
                          <span className="text-sm font-medium">Sentiment:</span>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 text-xs ${
                              enhancement.sentiment === 'positive' ? 'border-green-500 text-green-700' :
                              enhancement.sentiment === 'negative' ? 'border-red-500 text-red-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {enhancement.sentiment}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={saveNote}
                className="w-full"
                disabled={isProcessing}
              >
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">How to use:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click the microphone to start recording</li>
            <li>• Allow microphone access when prompted</li>
            <li>• Speak clearly into your device's microphone</li>
            <li>• Click stop when finished - AI will process your audio</li>
            <li>• Review and edit the transcription if needed</li>
            <li>• Get AI-powered summaries, action items, and insights</li>
            <li>• Save your enhanced voice note</li>
            <li>• Works on all modern browsers and devices</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceRecorder;