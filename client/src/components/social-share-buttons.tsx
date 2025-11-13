import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Facebook, Twitter, Linkedin, MessageCircle, Share2 } from "lucide-react";

interface SocialShareButtonsProps {
  contentType: "news" | "event" | "campaign" | "election";
  contentId: string;
  contentUrl: string;
  title: string;
  description?: string;
}

export function SocialShareButtons({
  contentType,
  contentId,
  contentUrl,
  title,
  description,
}: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [sharedPlatforms, setSharedPlatforms] = useState<Set<string>>(new Set());

  const shareUrl = `${window.location.origin}${contentUrl}`;
  const shareText = description ? `${title} - ${description}` : title;

  const recordShareMutation = useMutation({
    mutationFn: async (platform: "facebook" | "twitter" | "linkedin" | "whatsapp") => {
      const response = await apiRequest<{
        success: boolean;
        data: any;
        message: string;
      }>({
        url: "/api/social-shares",
        method: "POST",
        data: {
          platform,
          contentType,
          contentId,
          shareUrl,
        },
      });
      return { platform, response };
    },
    onSuccess: ({ platform, response }) => {
      setSharedPlatforms(prev => new Set(prev).add(platform));
      
      if (!response.data.alreadyShared) {
        toast({
          title: "🎉 +10 Points!",
          description: "Thanks for sharing! Points have been added to your account.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Share Recording Failed",
        description: error.message || "We couldn't record your share, but you can still share!",
        variant: "destructive",
      });
    },
  });

  const handleShare = async (platform: "facebook" | "twitter" | "whatsapp" | "linkedin") => {
    let shareLink = "";

    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
        break;
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
    }

    // Open share dialog
    window.open(shareLink, "_blank", "width=600,height=400");

    // Record the share (even if user doesn't complete it, we try to reward)
    // API will prevent duplicate points for same content
    recordShareMutation.mutate(platform);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });

        // Record as twitter share for points (generic)
        recordShareMutation.mutate("twitter");
      } catch (error) {
        // User cancelled share
      }
    }
  };

  const isShared = (platform: string) => sharedPlatforms.has(platform);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Native Share (Mobile) */}
      {navigator.share && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          data-testid="button-share-native"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      )}

      {/* Facebook */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("facebook")}
        disabled={isShared("facebook") || recordShareMutation.isPending}
        data-testid="button-share-facebook"
      >
        <Facebook className="h-4 w-4 mr-2" />
        {isShared("facebook") ? "Shared" : "Facebook"}
      </Button>

      {/* Twitter */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("twitter")}
        disabled={isShared("twitter") || recordShareMutation.isPending}
        data-testid="button-share-twitter"
      >
        <Twitter className="h-4 w-4 mr-2" />
        {isShared("twitter") ? "Shared" : "Twitter"}
      </Button>

      {/* WhatsApp */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("whatsapp")}
        disabled={isShared("whatsapp") || recordShareMutation.isPending}
        data-testid="button-share-whatsapp"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {isShared("whatsapp") ? "Shared" : "WhatsApp"}
      </Button>

      {/* LinkedIn */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("linkedin")}
        disabled={isShared("linkedin") || recordShareMutation.isPending}
        data-testid="button-share-linkedin"
      >
        <Linkedin className="h-4 w-4 mr-2" />
        {isShared("linkedin") ? "Shared" : "LinkedIn"}
      </Button>
    </div>
  );
}
