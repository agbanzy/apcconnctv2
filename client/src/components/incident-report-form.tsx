import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, MapPin, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const incidentSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  pollingUnit: z.string().min(1, "Polling unit is required"),
  severity: z.enum(["low", "medium", "high"], { required_error: "Please select a severity level" }),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
  location: z.string().min(3, "Location is required").max(500, "Location must be less than 500 characters"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function IncidentReportForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      pollingUnit: "",
      severity: undefined,
      description: "",
      location: "",
      coordinates: undefined,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("pollingUnit", data.pollingUnit);
      formData.append("severity", data.severity);
      formData.append("description", data.description);
      formData.append("location", data.location);
      
      if (data.coordinates) {
        formData.append("coordinates", JSON.stringify(data.coordinates));
      }
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/incidents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to submit incident report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Incident report submitted successfully",
      });
      form.reset();
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit incident report",
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("coordinates", { lat: latitude, lng: longitude });
        form.setValue("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsGettingLocation(false);
        toast({
          title: "Success",
          description: "Location captured successfully",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Error",
          description: `Failed to get location: ${error.message}`,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (data: IncidentFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Card data-testid="card-incident-report">
      <CardHeader>
        <CardTitle>Report Incident</CardTitle>
        <p className="text-sm text-muted-foreground">
          Anonymous reporting for election day issues
        </p>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief incident title"
                      data-testid="input-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pollingUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polling Unit</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter polling unit code"
                      data-testid="input-polling-unit"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-severity">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor Issues</SelectItem>
                      <SelectItem value="medium">Medium - Significant Issues</SelectItem>
                      <SelectItem value="high">High - Critical Issues</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what happened..."
                      rows={4}
                      data-testid="textarea-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Location or coordinates"
                      data-testid="input-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    data-testid="button-get-location"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Get Current Location
                      </>
                    )}
                  </Button>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Upload Evidence</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept="image/*";
                    input.multiple = true;
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        setFiles(Array.from(target.files));
                      }
                    };
                    input.click();
                  }}
                  data-testid="button-upload-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*,application/pdf";
                    input.multiple = true;
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        setFiles(Array.from(target.files));
                      }
                    };
                    input.click();
                  }}
                  data-testid="button-upload-file"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
              {files.length > 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-files-count">
                  {files.length} file(s) selected: {files.map(f => f.name).join(", ")}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
              data-testid="button-submit-report"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
