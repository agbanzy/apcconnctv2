import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method?: "GET" | "PUT" | "DELETE" | "HEAD";
    url: string;
    objectKey: string;
  }>;
  onComplete?: (objectKey: string) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 3145728,
  allowedFileTypes = ["image/jpeg", "image/png", "image/webp"],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[ObjectUploader] ====== FILE UPLOAD INITIATED ======`);
    console.log(`[ObjectUploader] File name: ${file.name}`);
    console.log(`[ObjectUploader] File size: ${file.size} bytes`);
    console.log(`[ObjectUploader] File type: ${file.type}`);

    if (file.size > maxFileSize) {
      console.log(`[ObjectUploader] ERROR: File too large (${file.size} > ${maxFileSize})`);
      toast({
        title: "File too large",
        description: `Maximum file size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    if (!allowedFileTypes.includes(file.type)) {
      console.log(`[ObjectUploader] ERROR: Invalid file type (${file.type})`);
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log(`[ObjectUploader] Requesting upload parameters from backend...`);
      const { url, objectKey, method } = await onGetUploadParameters();
      
      console.log(`[ObjectUploader] ====== UPLOAD PARAMETERS RECEIVED ======`);
      console.log(`[ObjectUploader] Upload URL: ${url}`);
      console.log(`[ObjectUploader] Object key: ${objectKey}`);
      console.log(`[ObjectUploader] Method: ${method}`);
      console.log(`[ObjectUploader] ========================================`);

      console.log(`[ObjectUploader] Starting upload to signed URL...`);
      const uploadResponse = await fetch(url, {
        method: method || "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      console.log(`[ObjectUploader] Upload response status: ${uploadResponse.status}`);
      console.log(`[ObjectUploader] Upload response ok: ${uploadResponse.ok}`);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => "No error details");
        console.log(`[ObjectUploader] Upload failed with response: ${errorText}`);
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      console.log(`[ObjectUploader] Upload successful! Calling onComplete with objectKey: ${objectKey}`);
      onComplete?.(objectKey);

      console.log(`[ObjectUploader] ====== UPLOAD COMPLETE ======`);

      toast({
        title: "Upload successful",
        description: "Your photo has been uploaded",
      });
    } catch (error) {
      console.error(`[ObjectUploader] Upload error:`, error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFileTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file"
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        className={buttonClassName}
        variant={buttonVariant}
        type="button"
        disabled={isUploading}
        data-testid="button-upload-photo"
      >
        {isUploading ? "Uploading..." : children}
      </Button>
    </div>
  );
}
