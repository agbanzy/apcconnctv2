import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, MapPin } from "lucide-react";

export function IncidentReportForm() {
  const [severity, setSeverity] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = () => {
    console.log("Incident report submitted", { severity, files });
  };

  return (
    <Card data-testid="card-incident-report">
      <CardHeader>
        <CardTitle>Report Incident</CardTitle>
        <p className="text-sm text-muted-foreground">
          Anonymous reporting for election day issues
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="polling-unit">Polling Unit</Label>
          <Input
            id="polling-unit"
            placeholder="Enter polling unit code"
            data-testid="input-polling-unit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Severity Level</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="severity" data-testid="select-severity">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Minor Issues</SelectItem>
              <SelectItem value="medium">Medium - Significant Issues</SelectItem>
              <SelectItem value="high">High - Critical Issues</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Incident Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what happened..."
            rows={4}
            data-testid="textarea-description"
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Button variant="outline" className="w-full" data-testid="button-get-location">
            <MapPin className="h-4 w-4 mr-2" />
            Get Current Location
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Upload Evidence</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.multiple = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files) {
                    setFiles(Array.from(target.files));
                    console.log("Files selected:", target.files.length);
                  }
                };
                input.click();
              }}
              data-testid="button-upload-photo"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button variant="outline" className="flex-1" data-testid="button-upload-file">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-files-count">
              {files.length} file(s) selected
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!severity}
          data-testid="button-submit-report"
        >
          Submit Report
        </Button>
      </CardFooter>
    </Card>
  );
}
