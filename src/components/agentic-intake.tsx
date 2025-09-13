"use client";

import { useState } from "react";
import { Bot, Send, Mic, MicOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { LocationSubmission } from "@/types/location";
import { DuplicateWarning } from "./duplicate-warning";

interface AgenticIntakeProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submission: LocationSubmission) => void;
  existingLocations?: any[];
}

export function AgenticIntake({
  isOpen,
  onClose,
  onSubmit,
  existingLocations = [],
}: AgenticIntakeProps) {
  const [mode, setMode] = useState<"chat" | "form">("chat");
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm here to help you add a new Amala location. You can tell me about the place in your own words, or I can guide you through some questions. What would you like to share?",
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [extractedInfo, setExtractedInfo] = useState<
    Partial<LocationSubmission>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    similarLocations: any[];
  } | null>(null);

  // Form state for manual entry
  const [formData, setFormData] = useState<LocationSubmission>({
    name: "",
    address: "",
    phone: "",
    website: "",
    description: "",
    serviceType: "both",
    priceRange: "$$",
    cuisine: [],
  });

  const handleChatSubmit = async () => {
    if (!currentMessage.trim() || isProcessing) return;

    setIsProcessing(true);
    const newMessages = [
      ...chatMessages,
      { role: "user", content: currentMessage },
    ];
    setChatMessages(newMessages);
    setCurrentMessage("");

    try {
      // Call the AI extraction API
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentMessage,
          conversationHistory: chatMessages,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update extracted information
        setExtractedInfo((prev) => ({
          ...prev,
          ...result.data.extraction.extracted,
        }));

        // Add AI response
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              result.data.followUpQuestion || "Thanks for that information!",
          },
        ]);

        // Check for duplicates if we have enough info
        if (
          result.data.extraction.extracted.name &&
          result.data.extraction.extracted.address
        ) {
          await checkForDuplicates({
            ...extractedInfo,
            ...result.data.extraction.extracted,
          });
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm having trouble understanding. Could you provide more details about the Amala restaurant?",
          },
        ]);
      }
    } catch (error) {
      console.error("AI extraction failed:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having technical difficulties. Could you try again?",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkForDuplicates = async (location: Partial<LocationSubmission>) => {
    try {
      const response = await fetch("/api/ai/extract", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          existingLocations: [], // In real app, pass existing locations
        }),
      });

      const result = await response.json();
      if (result.success && result.data.isDuplicate) {
        setDuplicateWarning(result.data);
      }
    } catch (error) {
      console.error("Duplicate check failed:", error);
    }
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    // In a real implementation, this would start/stop voice recognition
    if (!isListening) {
      // Mock voice input
      setTimeout(() => {
        setCurrentMessage(
          "There's this great place called Mama Kemi's Amala Spot on Victoria Island"
        );
        setIsListening(false);
      }, 2000);
    }
  };

  const handleFormSubmit = () => {
    if (!formData.name || !formData.address) {
      alert("Please provide at least a name and address");
      return;
    }
    onSubmit(formData);
  };

  const handleAIFormSubmit = () => {
    // Convert extracted information to submission
    const submission: LocationSubmission = {
      name: extractedInfo.name || "Unknown Location",
      address: extractedInfo.address || "",
      phone: extractedInfo.phone || "",
      website: extractedInfo.website || "",
      description: extractedInfo.description || "",
      serviceType: extractedInfo.serviceType || "both",
      priceRange: extractedInfo.priceRange || "$$",
      cuisine: extractedInfo.cuisine || ["Nigerian"],
    };
    onSubmit(submission);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-600" />
            Add New Amala Location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === "chat" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("chat")}
              className="flex-1"
            >
              AI Assistant
            </Button>
            <Button
              variant={mode === "form" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("form")}
              className="flex-1"
            >
              Manual Form
            </Button>
          </div>

          {mode === "chat" ? (
            <>
              {/* Chat Interface */}
              <div className="border rounded-lg h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-orange-600 text-white"
                          : "bg-white border"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Tell me about the Amala spot..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleVoiceToggle}
                  variant="outline"
                  size="sm"
                  className={isListening ? "bg-red-100 text-red-600" : ""}
                  disabled={isProcessing}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={handleChatSubmit}
                  size="sm"
                  disabled={isProcessing || !currentMessage.trim()}
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Duplicate Warning */}
              {duplicateWarning && duplicateWarning.isDuplicate && (
                <DuplicateWarning
                  similarLocations={duplicateWarning.similarLocations}
                  confidence={0.9}
                  onProceedAnyway={() => {
                    handleAIFormSubmit();
                    setDuplicateWarning(null);
                  }}
                  onCancel={() => {
                    setDuplicateWarning(null);
                    setExtractedInfo({});
                    setChatMessages([
                      {
                        role: "assistant",
                        content:
                          "Submission cancelled. Feel free to add a different location!",
                      },
                    ]);
                  }}
                />
              )}

              {/* Extracted Information */}
              {Object.keys(extractedInfo).length > 0 &&
                !duplicateWarning?.isDuplicate && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">
                        Extracted Information:
                      </h4>
                      <div className="text-sm space-y-1">
                        {extractedInfo.name && (
                          <p>
                            <span className="font-medium">Name:</span>{" "}
                            {extractedInfo.name}
                          </p>
                        )}
                        {extractedInfo.address && (
                          <p>
                            <span className="font-medium">Address:</span>{" "}
                            {extractedInfo.address}
                          </p>
                        )}
                        {extractedInfo.serviceType && (
                          <p>
                            <span className="font-medium">Service:</span>{" "}
                            {extractedInfo.serviceType}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleAIFormSubmit}
                        className="mt-3 w-full"
                        size="sm"
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Submit Location"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </>
          ) : (
            <>
              {/* Manual Form */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Mama's Amala Spot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+234 xxx xxx xxxx"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Street address, city, state"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          serviceType: value as "dine-in" | "takeaway" | "both",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine-in">Dine-in only</SelectItem>
                        <SelectItem value="takeaway">Takeaway only</SelectItem>
                        <SelectItem value="both">
                          Both dine-in & takeaway
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priceRange">Price Range</Label>
                    <Select
                      value={formData.priceRange}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          priceRange: value as "$" | "$$" | "$$$" | "$$$$",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$">$ - Budget</SelectItem>
                        <SelectItem value="$$">$$ - Moderate</SelectItem>
                        <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                        <SelectItem value="$$$$">
                          $$$$ - Very Expensive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the location..."
                  />
                </div>

                <Button onClick={handleFormSubmit} className="w-full">
                  Submit Location
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
