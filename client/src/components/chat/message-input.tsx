import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Smile } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="text-gray-600 p-2"
        >
          <Plus className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-12 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 text-gray-600 p-2"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>
        
        <Button 
          type="submit" 
          disabled={!message.trim()}
          className="bg-primary hover:bg-primary/90 text-white p-3 rounded-full"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
