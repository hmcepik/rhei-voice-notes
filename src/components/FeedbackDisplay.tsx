import { Star, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeedbackDisplayProps {
  feedback: {
    rating: number;
    comment?: string;
    transcriptionAccuracy?: number;
  };
}

const FeedbackDisplay = ({ feedback }: FeedbackDisplayProps) => {
  const renderStars = (rating: number, size: "sm" | "xs" = "sm") => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size === "xs" ? "w-3 h-3" : "w-4 h-4"} ${
            star <= rating
              ? "fill-rhei-primary text-rhei-primary"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-rhei-primary" />
          <span>Your Feedback</span>
        </h4>
        <Badge variant="secondary" className="text-xs">
          {feedback.rating}/5 overall
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/50 p-3 rounded-md">
          <div className="font-medium mb-1">Overall Experience</div>
          {renderStars(feedback.rating, "xs")}
        </div>
        
        {feedback.transcriptionAccuracy && (
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="font-medium mb-1">Transcription Accuracy</div>
            {renderStars(feedback.transcriptionAccuracy, "xs")}
          </div>
        )}
      </div>

      {feedback.comment && (
        <div className="bg-rhei-primary/5 p-3 rounded-md">
          <div className="font-medium mb-1 text-sm">Comment</div>
          <p className="text-xs text-muted-foreground italic">"{feedback.comment}"</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackDisplay;