import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Copy, Trash2, Edit3, Save, X, Calendar, FileText, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { VoiceNote } from "@/types/VoiceNote";
import FeedbackModal from "@/components/FeedbackModal";
import FeedbackDisplay from "@/components/FeedbackDisplay";

const HistoryPage = () => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedNoteForFeedback, setSelectedNoteForFeedback] = useState<VoiceNote | null>(null);

  useEffect(() => {
    loadNotes();
    
    // Add event listener for when localStorage changes (notes are added)
    const handleStorageChange = () => {
      loadNotes();
    };
    
    // Listen for custom events when notes are saved
    window.addEventListener('rhei-note-saved', handleStorageChange);
    
    // Also listen for focus events to refresh when user comes back to this tab
    window.addEventListener('focus', loadNotes);
    
    return () => {
      window.removeEventListener('rhei-note-saved', handleStorageChange);
      window.removeEventListener('focus', loadNotes);
    };
  }, []);

  const loadNotes = () => {
    const savedNotes = localStorage.getItem('rhei-voice-notes');
    console.log('Loading notes from localStorage:', savedNotes); // Debug log
    
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
          ...note,
          title: note.title || `Note - ${new Date(note.timestamp).toLocaleString()}`, // Provide default title for old notes
          timestamp: new Date(note.timestamp)
        }));
        console.log('Parsed notes:', parsedNotes); // Debug log
        setNotes(parsedNotes);
      } catch (error) {
        console.error('Error parsing notes from localStorage:', error);
        setNotes([]);
      }
    } else {
      console.log('No notes found in localStorage'); // Debug log
      setNotes([]);
    }
  };

  const filteredNotes = notes.filter(note => {
    return !searchTerm || 
      (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      note.transcription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.summary && note.summary.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const deleteNote = (id: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notes.filter(note => note.id !== id);
      setNotes(updatedNotes);
      localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));
      toast.success("Note deleted successfully");
    }
  };

  const startEditing = (note: VoiceNote) => {
    setEditingNote(note.id);
    setEditText(note.transcription);
    setEditTitle(note.title);
  };

  const saveEdit = (id: string) => {
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, title: editTitle, transcription: editText } : note
    );
    setNotes(updatedNotes);
    localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));
    setEditingNote(null);
    setEditText("");
    setEditTitle("");
    toast.success("Note updated successfully");
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditText("");
    setEditTitle("");
  };

  const copyToClipboard = async (note: VoiceNote) => {
    const content = `${note.title} - ${note.timestamp.toLocaleString()}

Transcription:
${note.transcription}

${note.summary ? `Summary:
${note.summary}

` : ''}`;

    try {
      await navigator.clipboard.writeText(content);
      toast.success("Note copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const openFeedbackModal = (note: VoiceNote) => {
    setSelectedNoteForFeedback(note);
    setFeedbackModalOpen(true);
  };

  const saveFeedback = (feedback: { rating: number; comment?: string; transcriptionAccuracy?: number }) => {
    if (!selectedNoteForFeedback) return;
    
    const updatedNotes = notes.map(note => 
      note.id === selectedNoteForFeedback.id ? { ...note, feedback } : note
    );
    setNotes(updatedNotes);
    localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));
    toast.success("Feedback saved successfully");
    setSelectedNoteForFeedback(null);
  };

  const stats = {
    total: notes.length,
    filtered: filteredNotes.length,
    withSummary: notes.filter(note => note.summary).length
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Debug Info & Header & Stats */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold">Voice Notes History</h2>
            <p className="text-muted-foreground">
              {stats.filtered} of {stats.total} notes 
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
            {/* Debug info */}
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <p>Debug: localStorage key exists: {localStorage.getItem('rhei-voice-notes') ? 'YES' : 'NO'}</p>
              <p>Debug: localStorage content length: {localStorage.getItem('rhei-voice-notes')?.length || 0}</p>
              <p>Debug: notes array length: {notes.length}</p>
              <p>Debug: filtered notes length: {filteredNotes.length}</p>
              <p>Debug: first note: {notes.length > 0 ? JSON.stringify(notes[0]).substring(0, 100) + '...' : 'none'}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadNotes}
                className="mt-1"
              >
                Refresh Notes
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 lg:gap-4 text-center">
            <div className="bg-card p-2 lg:p-3 rounded-lg border">
              <div className="flex items-center justify-center space-x-1 text-rhei-primary">
                <FileText className="w-4 h-4" />
                <span className="font-semibold">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Notes</p>
            </div>
            <div className="bg-card p-2 lg:p-3 rounded-lg border">
              <div className="flex items-center justify-center space-x-1 text-rhei-primary">
                <Search className="w-4 h-4" />
                <span className="font-semibold">{stats.filtered}</span>
              </div>
              <p className="text-xs text-muted-foreground">Showing</p>
            </div>
            <div className="bg-card p-2 lg:p-3 rounded-lg border">
              <div className="flex items-center justify-center space-x-1 text-rhei-primary">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">{stats.withSummary}</span>
              </div>
              <p className="text-xs text-muted-foreground">Summarized</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search titles, notes and summaries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {notes.length === 0 ? (
                  <>
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No voice notes yet</h3>
                    <p>Start recording to see your notes appear here.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No matching notes</h3>
                    <p>Try adjusting your search terms.</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="note-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {editingNote === note.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-lg font-semibold mb-2"
                          placeholder="Note title..."
                        />
                      ) : (
                        <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{note.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openFeedbackModal(note)}
                        className={note.feedback ? "text-rhei-primary" : ""}
                        title={note.feedback ? "Edit feedback" : "Add feedback"}
                      >
                        <ThumbsUp className={`w-4 h-4 ${note.feedback ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(note)}
                        disabled={editingNote === note.id}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(note)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Transcription</h4>
                    {editingNote === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-24"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(note.id)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm bg-muted p-3 rounded-md">{note.transcription}</p>
                    )}
                  </div>

                  {note.summary && (
                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="bg-rhei-primary/5 p-3 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap">{note.summary}</pre>
                      </div>
                    </div>
                  )}

                  {note.feedback && (
                    <FeedbackDisplay feedback={note.feedback} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={saveFeedback}
        initialFeedback={selectedNoteForFeedback?.feedback}
      />
    </div>
  );
};

export default HistoryPage;