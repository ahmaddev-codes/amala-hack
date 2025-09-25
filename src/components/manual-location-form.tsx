"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  StarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";
import { LocationResult } from "@/types/location";

const locationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  description: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  rating: z.number().min(1).max(5).optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  category: z.string().min(1, "Category is required"),
  cuisine: z.array(z.string()).min(1, "At least one cuisine type is required"),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface ManualLocationFormProps {
  onSubmit: (location: LocationResult) => Promise<void>;
  onCancel: () => void;
}

export function ManualLocationForm({ onSubmit, onCancel }: ManualLocationFormProps) {
  const { error, success } = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [cuisineInput, setCuisineInput] = useState("");
  const [cuisineList, setCuisineList] = useState<string[]>(["Nigerian"]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      category: "restaurant",
      cuisine: ["Nigerian"],
      coordinates: { lat: 6.5244, lng: 3.3792 }, // Default to Lagos
    },
  });

  const watchedAddress = watch("address");
  const watchedCoordinates = watch("coordinates");

  // Geocode address using Google Geocoding API
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      error("Please enter an address first.", "No Address");
      return;
    }

    setIsGeocoding(true);
    try {
      console.log("Geocoding address:", address);

      // Use Google Geocoding API
      const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_MAPS_API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Geocoding response:", data);

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const coordinates = {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        };

        console.log("Setting coordinates:", coordinates);
        setValue("coordinates.lat", coordinates.lat);
        setValue("coordinates.lng", coordinates.lng);

        // Force form to re-validate
        setTimeout(() => {
          setValue("coordinates", coordinates);
        }, 100);

        success(`Coordinates found: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`, "Geocoding Success");
      } else if (data.status === 'ZERO_RESULTS') {
        error("Address not found. Please check the address or enter coordinates manually.", "Geocoding Failed");
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        error("Geocoding quota exceeded. Please try again later.", "Quota Exceeded");
      } else if (data.status === 'REQUEST_DENIED') {
        error("Geocoding request denied. Please check API configuration.", "Request Denied");
      } else {
        error(`Geocoding failed: ${data.status}`, "Geocoding Error");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      if (err instanceof Error && err.message.includes('API key not configured')) {
        error("Google Maps API key is not configured. Please contact support.", "Configuration Error");
      } else {
        error(`Failed to geocode address: ${err instanceof Error ? err.message : 'Unknown error'}. Please enter coordinates manually.`, "Geocoding Error");
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const addCuisine = () => {
    if (cuisineInput.trim() && !cuisineList.includes(cuisineInput.trim())) {
      const newCuisineList = [...cuisineList, cuisineInput.trim()];
      setCuisineList(newCuisineList);
      setValue("cuisine", newCuisineList);
      setCuisineInput("");
    }
  };

  const removeCuisine = (cuisine: string) => {
    const newCuisineList = cuisineList.filter(c => c !== cuisine);
    setCuisineList(newCuisineList);
    setValue("cuisine", newCuisineList);
  };

  const onFormSubmit = async (data: LocationFormData) => {
    const locationResult: LocationResult = {
      name: data.name,
      address: data.address,
      description: data.description,
      phone: data.phone,
      website: data.website,
      rating: data.rating,
      priceRange: data.priceRange,
      coordinates: data.coordinates,
      photos: [],
      source: 'manual',
      confidence: 1.0, // Manual entries are 100% confident
    };

    await onSubmit(locationResult);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-orange-600" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Restaurant Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Mama Cass Amala"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(value) => setValue("category", value)} defaultValue="restaurant">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="fast_food">Fast Food</SelectItem>
                    <SelectItem value="food_truck">Food Truck</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe the restaurant, specialties, atmosphere..."
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-orange-600" />
              Location Details
            </h3>

            <div>
              <Label htmlFor="address">Full Address *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="e.g., 123 Ikeja Way, Lagos, Nigeria"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => geocodeAddress(watchedAddress)}
                  disabled={isGeocoding || !watchedAddress}
                  variant="outline"
                >
                  {isGeocoding ? "Finding..." : "Find Coordinates"}
                </Button>
              </div>
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            {/* Current Coordinates Display */}
            {watchedCoordinates && (watchedCoordinates.lat !== 6.5244 || watchedCoordinates.lng !== 3.3792) && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Current Coordinates:</strong> {watchedCoordinates.lat?.toFixed(6)}, {watchedCoordinates.lng?.toFixed(6)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="lat">Latitude *</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  {...register("coordinates.lat", { valueAsNumber: true })}
                  placeholder="6.5244"
                  className="mt-1"
                />
                {errors.coordinates?.lat && (
                  <p className="text-red-500 text-sm mt-1">{errors.coordinates.lat.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lng">Longitude *</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  {...register("coordinates.lng", { valueAsNumber: true })}
                  placeholder="3.3792"
                  className="mt-1"
                />
                {errors.coordinates?.lng && (
                  <p className="text-red-500 text-sm mt-1">{errors.coordinates.lng.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contact & Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative mt-1">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+234 xxx xxx xxxx"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <div className="relative mt-1">
                  <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="website"
                    {...register("website")}
                    placeholder="https://restaurant-website.com"
                    className="pl-10"
                  />
                </div>
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="rating">Rating (1-5)</Label>
                <div className="relative mt-1">
                  <StarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    {...register("rating", { valueAsNumber: true })}
                    placeholder="4.5"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="priceRange">Price Range</Label>
                <Select onValueChange={(value) => setValue("priceRange", value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ - Budget (₦500-1,500)</SelectItem>
                    <SelectItem value="$$">$$ - Moderate (₦1,500-3,000)</SelectItem>
                    <SelectItem value="$$$">$$$ - Expensive (₦3,000-6,000)</SelectItem>
                    <SelectItem value="$$$$">$$$$ - Very Expensive (₦6,000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cuisine Types */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cuisine Types *</h3>

            <div className="flex gap-2 mb-3">
              <Input
                value={cuisineInput}
                onChange={(e) => setCuisineInput(e.target.value)}
                placeholder="Add cuisine type (e.g., Amala, Yoruba, Nigerian)"
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCuisine();
                  }
                }}
              />
              <Button type="button" onClick={addCuisine} variant="outline">
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {cuisineList.map((cuisine) => (
                <span
                  key={cuisine}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                >
                  {cuisine}
                  <button
                    type="button"
                    onClick={() => removeCuisine(cuisine)}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {errors.cuisine && (
              <p className="text-red-500 text-sm mt-2">{errors.cuisine.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
            {isSubmitting ? "Adding Location..." : "Add Location"}
          </Button>
        </div>
      </form>
    </div>
  );
}
