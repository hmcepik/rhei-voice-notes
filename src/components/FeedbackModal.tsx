import { useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { rating: number; comment?: string; transcriptionAccuracy?: number }) => void;
  initialFeedback?: {
    rating: number;
    comment?: string;
    transcriptionAccuracy?: number;
  };
}

const FeedbackModal = ({ isOpen, onClose, onSubmit, initialFeedback }: FeedbackModalProps) => {
  const [rating, setRating] = useState(initialFeedback?.rating || 0);
  const [transcriptionAccuracy, setTranscriptionAccuracy] = useState(initialFeedback?.transcriptionAccuracy || 0);
  const [comment, setComment] = useState(initialFeedback?.comment || "");

  const handleSubmit = () => {
    onSubmit({
      rating,
      comment: comment.trim() || undefined,
      transcriptionAccuracy
    });
    onClose();
  };

  const renderStars = (currentRating: number, onRate: (rating: number) => void, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="transition-colors hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= currentRating
                  ? "fill-rhei-primary text-rhei-primary"
                  : "text-muted-foreground hover:text-rhei-primary"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-rhei-primary" />
            <span>Rate This Voice Note</span>
          </DialogTitle>
          <DialogDescription>
            Help us improve by rating your experience with this voice note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {renderStars(rating, setRating, "Overall Experience")}
          
          <Separator />
          
          {renderStars(transcriptionAccuracy, setTranscriptionAccuracy, "Transcription Accuracy")}
          
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share any specific feedback about the transcription quality, missing words, or suggestions for improvement..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0 || transcriptionAccuracy === 0}
              className="min-w-20"
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;