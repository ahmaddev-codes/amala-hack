"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  SparklesIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationResult } from "@/types/location";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  locations?: LocationResult[];
  timestamp: Date;
}

interface LocationAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (locations: LocationResult[]) => Promise<void>;
  isEmbedded?: boolean;
}

export function LocationAssistant({
  isOpen,
  onClose,
  onSubmit,
  isEmbedded = false,
}: LocationAssistantProps) {
  const { user, getIdToken } = useAuth();
  const { success, error, info } = useToast();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your global Amala discovery assistant. Tell me about any Amala spot or Nigerian restaurant you'd like to add from anywhere in the world - for example: \"There's this amazing Amala place in London\" or \"Great Nigerian restaurant in New York\" and I'll help you find and add it to the platform! 🌍🍲",
      timestamp: new Date(),
    }
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Speech recognition availability
  const speechRecognition = typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        error("Speech recognition failed. Please try typing instead.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [error]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      error("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      info("Listening... Speak now!");
    }
  };

  const searchLocations = async (query: string): Promise<LocationResult[]> => {
    try {
      // Try to get auth token, but continue without it if not available
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth header only if token is available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const webSearchResponse = await fetch('/api/ai/location-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      if (!webSearchResponse.ok) {
        throw new Error('Web search failed');
      }

      const webResults = await webSearchResponse.json();
      return webResults.locations || [];
    } catch (err) {
      console.error('Location search error:', err);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentInput.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);

    try {
      // Search for locations based on user input
      const locations = await searchLocations(userMessage.content);
      
      if (locations.length > 0) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: `Great! I found ${locations.length} potential Amala location${locations.length > 1 ? 's' : ''} based on your description. Please review and select the ones you'd like to add:`,
          locations,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setSearchResults(locations);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: "I couldn't find any specific locations matching your description. Could you provide more details like the area name, landmark, or restaurant name? For example: 'Mama Cass Amala in Ikeja' or 'the popular Amala joint near National Theatre'",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      error("Failed to search for locations. Please try again.");
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error while searching. Please try rephrasing your request or check your connection.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationToggle = (locationId: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
    } else {
      newSelected.add(locationId);
    }
    setSelectedLocations(newSelected);
  };

  const handleSubmitSelected = () => {
    const selected = searchResults.filter((loc, index) => {
      const locationKey = loc.id || `${loc.name}-${index}`;
      return selectedLocations.has(locationKey);
    });
    if (selected.length === 0) {
      error("Please select at least one location to add.");
      return;
    }

    onSubmit(selected);
    success(`Successfully added ${selected.length} location${selected.length > 1 ? 's' : ''}!`);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // If embedded, render without dialog wrapper
  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full">
        {/* Reuse the embedded content */}
        <div className="flex flex-col h-full">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px] max-h-[400px]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Location Results */}
                  {message.locations && (
                    <div className="mt-4 space-y-3">
                      {message.locations.map((location, index) => {
                        const locationKey = location.id || `${location.name}-${index}`;
                        return (
                        <Card
                          key={locationKey}
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedLocations.has(locationKey)
                              ? 'ring-2 ring-orange-500 bg-orange-50'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleLocationToggle(locationKey)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{location.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {location.source === 'web_search' ? 'Web' : 'Places'}
                                  </Badge>
                                  {selectedLocations.has(locationKey) && (
                                    <CheckIcon className="w-4 h-4 text-orange-600" />
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                  <MapPinIcon className="w-4 h-4" />
                                  <span>{location.address}</span>
                                </div>
                                
                                {location.description && (
                                  <p className="text-sm text-gray-700 mb-2">{location.description}</p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {location.rating && (
                                    <span>⭐ {location.rating}</span>
                                  )}
                                  {location.priceRange && (
                                    <span>{location.priceRange}</span>
                                  )}
                                  {location.confidence && (
                                    <span className="text-orange-600">
                                      {Math.round(location.confidence * 100)}% match
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {location.photos && location.photos.length > 0 && (
                                <div className="ml-4">
                                  <Image
                                    src={location.photos[0]}
                                    alt={location.name}
                                    width={60}
                                    height={60}
                                    className="rounded-lg object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-orange-600" />
                  <span className="text-sm text-gray-600">Searching for locations...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe the Amala spot you're looking for..."
                  className="resize-none min-h-[60px] bg-white"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isLoading}
                  className="bg-orange-600 hover:bg-orange-700 px-6"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
                {speechRecognition && (
                  <Button
                    onClick={handleVoiceInput}
                    variant="outline"
                    size="sm"
                    className={isListening ? 'bg-red-50 border-red-200' : ''}
                  >
                    <MicrophoneIcon className={`w-4 h-4 ${isListening ? 'text-red-600' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
            
            {selectedLocations.size > 0 && (
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedLocations.size} location{selectedLocations.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleSubmitSelected}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Selected Locations
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <SparklesIcon className="w-6 h-6 text-orange-600" />
            Amala Discovery Assistant
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Tell me about an Amala spot and I&apos;ll help you find and add it to the platform
          </p>
        </DialogHeader>

        {/* Reuse the embedded content */}
        <div className="flex flex-col h-full">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px] max-h-[400px]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Location Results */}
                  {message.locations && (
                    <div className="mt-4 space-y-3">
                      {message.locations.map((location, index) => {
                        const locationKey = location.id || `${location.name}-${index}`;
                        return (
                        <Card
                          key={locationKey}
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedLocations.has(locationKey)
                              ? 'ring-2 ring-orange-500 bg-orange-50'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleLocationToggle(locationKey)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{location.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {location.source === 'web_search' ? 'Web' : 'Places'}
                                  </Badge>
                                  {selectedLocations.has(locationKey) && (
                                    <CheckIcon className="w-4 h-4 text-orange-600" />
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                  <MapPinIcon className="w-4 h-4" />
                                  <span>{location.address}</span>
                                </div>
                                
                                {location.description && (
                                  <p className="text-sm text-gray-700 mb-2">{location.description}</p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {location.rating && (
                                    <span>⭐ {location.rating}</span>
                                  )}
                                  {location.priceRange && (
                                    <span>{location.priceRange}</span>
                                  )}
                                  {location.confidence && (
                                    <span className="text-orange-600">
                                      {Math.round(location.confidence * 100)}% match
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {location.photos && location.photos.length > 0 && (
                                <div className="ml-4">
                                  <Image
                                    src={location.photos[0]}
                                    alt={location.name}
                                    width={60}
                                    height={60}
                                    className="rounded-lg object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-orange-600" />
                  <span className="text-sm text-gray-600">Searching for locations...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe the Amala spot you're looking for..."
                  className="resize-none min-h-[60px] bg-white"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isLoading}
                  className="bg-orange-600 hover:bg-orange-700 px-6"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
                {speechRecognition && (
                  <Button
                    onClick={handleVoiceInput}
                    variant="outline"
                    size="sm"
                    className={isListening ? 'bg-red-50 border-red-200' : ''}
                  >
                    <MicrophoneIcon className={`w-4 h-4 ${isListening ? 'text-red-600' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
            
            {selectedLocations.size > 0 && (
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedLocations.size} location{selectedLocations.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleSubmitSelected}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Selected Locations
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
