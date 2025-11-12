import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  endpoint: string;
  filters?: Record<string, any>;
  filename?: string;
  label?: string;
}

export function ExportButton({
  endpoint,
  filters = {},
  filename,
  label = "Export",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, String(value));
        }
      });

      const url = queryParams.toString()
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const downloadFilename =
        filename || filenameMatch?.[1] || `export_${Date.now()}.csv`;

      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
      data-testid="button-export"
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : label}
    </Button>
  );
}
