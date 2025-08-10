
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  HelpCircle, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Shield, 
  Send, 
  ArrowLeft,
  Book,
  Phone,
  Mail,
  Globe
} from "lucide-react";

interface HelpSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpSupportModal({ open, onOpenChange }: HelpSupportModalProps) {
  const { user, isDarkMode } = useAuth();
  const { toast } = useToast();
  
  const [currentView, setCurrentView] = useState<'main' | 'contact' | 'faq' | 'feedback'>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    message: '',
    email: user?.email || ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitTicket = async () => {
    if (!formData.subject.trim() || !formData.category || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call for support ticket
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Support Ticket Submitted",
        description: "We'll get back to you within 24 hours via email",
      });
      
      // Reset form
      setFormData({
        subject: '',
        category: '',
        message: '',
        email: user?.email || ''
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const faqItems = [
    {
      question: "How do I change my password?",
      answer: "Go to Settings → Privacy & Security → Change Password. You'll need to verify via SMS."
    },
    {
      question: "How do I add friends?",
      answer: "Use the search feature to find users, then send them a friend request."
    },
    {
      question: "What are coins used for?",
      answer: "Coins can be used to send gifts to other users or transfer credits to friends."
    },
    {
      question: "How do I join chat rooms?",
      answer: "Go to the Rooms tab and tap on any available room to join the conversation."
    },
    {
      question: "How do I become a mentor?",
      answer: "Visit the Mentor page and apply to become a mentor in your area of expertise."
    },
    {
      question: "Why can't I send messages?",
      answer: "Check your internet connection. If banned from rooms, contact support."
    }
  ];

  const renderMainView = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <HelpCircle className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className={cn("text-xl font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
          How can we help you?
        </h3>
        <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
          Choose an option below to get started
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className={cn("justify-start h-auto p-4", isDarkMode ? "border-gray-600 hover:bg-gray-700" : "")}
          onClick={() => setCurrentView('faq')}
        >
          <Book className="w-5 h-5 mr-3 text-blue-500" />
          <div className="text-left">
            <div className="font-medium">Frequently Asked Questions</div>
            <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              Find quick answers to common questions
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className={cn("justify-start h-auto p-4", isDarkMode ? "border-gray-600 hover:bg-gray-700" : "")}
          onClick={() => setCurrentView('contact')}
        >
          <MessageSquare className="w-5 h-5 mr-3 text-green-500" />
          <div className="text-left">
            <div className="font-medium">Contact Support</div>
            <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              Submit a support ticket for personalized help
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className={cn("justify-start h-auto p-4", isDarkMode ? "border-gray-600 hover:bg-gray-700" : "")}
          onClick={() => setCurrentView('feedback')}
        >
          <Lightbulb className="w-5 h-5 mr-3 text-orange-500" />
          <div className="text-left">
            <div className="font-medium">Send Feedback</div>
            <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              Share your ideas and suggestions
            </div>
          </div>
        </Button>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <Phone className="w-5 h-5 text-blue-600" />
          <div>
            <div className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
              Emergency Support
            </div>
            <div className={cn("text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>
              For urgent issues, contact us directly
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            <Mail className="w-3 h-3 mr-1" />
            support@mechat.com
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Help Center
          </Button>
        </div>
      </div>
    </div>
  );

  const renderContactView = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('main')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
          Contact Support
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}
          />
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
            <SelectTrigger className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">Account Issues</SelectItem>
              <SelectItem value="technical">Technical Problems</SelectItem>
              <SelectItem value="billing">Billing & Coins</SelectItem>
              <SelectItem value="privacy">Privacy & Security</SelectItem>
              <SelectItem value="friends">Friends & Social</SelectItem>
              <SelectItem value="rooms">Chat Rooms</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Brief description of your issue"
            className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}
          />
        </div>

        <div>
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder="Please describe your issue in detail..."
            rows={5}
            className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}
          />
        </div>

        <Button
          onClick={handleSubmitTicket}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Ticket
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderFAQView = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('main')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
          Frequently Asked Questions
        </h3>
      </div>

      <div className="space-y-3">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className={cn(
              "p-4 rounded-lg border",
              isDarkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-200"
            )}
          >
            <h4 className={cn("font-medium mb-2", isDarkMode ? "text-white" : "text-gray-900")}>
              {item.question}
            </h4>
            <p className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
              {item.answer}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className={cn("text-sm mb-3", isDarkMode ? "text-gray-400" : "text-gray-600")}>
          Still need help?
        </p>
        <Button onClick={() => setCurrentView('contact')}>
          Contact Support
        </Button>
      </div>
    </div>
  );

  const renderFeedbackView = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('main')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
          Send Feedback
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="feedback-category">Feedback Type</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
            <SelectTrigger className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}>
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suggestion">Suggestion</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="improvement">App Improvement</SelectItem>
              <SelectItem value="general">General Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="feedback-subject">Subject</Label>
          <Input
            id="feedback-subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Brief summary of your feedback"
            className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}
          />
        </div>

        <div>
          <Label htmlFor="feedback-message">Your Feedback</Label>
          <Textarea
            id="feedback-message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder="Tell us what you think! Your feedback helps us improve MeChat."
            rows={5}
            className={isDarkMode ? "bg-gray-800 border-gray-600" : ""}
          />
        </div>

        <Button
          onClick={handleSubmitTicket}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sending...</span>
            </div>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md mx-auto", isDarkMode ? "bg-gray-900 border-gray-700" : "")}>
        <DialogHeader>
          <DialogTitle className={cn("text-center", isDarkMode ? "text-white" : "")}>
            Help & Support
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {currentView === 'main' && renderMainView()}
          {currentView === 'contact' && renderContactView()}
          {currentView === 'faq' && renderFAQView()}
          {currentView === 'feedback' && renderFeedbackView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
