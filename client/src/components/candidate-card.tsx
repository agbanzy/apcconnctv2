import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CandidateCardProps {
  id: string;
  name: string;
  position: string;
  imageUrl?: string;
  manifesto: string;
  experience: string;
  selected?: boolean;
}

export function CandidateCard({
  id,
  name,
  position,
  imageUrl,
  manifesto,
  experience,
  selected,
}: CandidateCardProps) {
  return (
    <Card
      className={`hover-elevate transition-all cursor-pointer ${
        selected ? "border-primary border-2" : ""
      }`}
      data-testid={`card-candidate-${id}`}
    >
      <CardHeader className="gap-3 space-y-0">
        <div className="flex items-start gap-4">
          <RadioGroupItem value={id} id={id} className="mt-1" />
          <div className="flex-1">
            <Label htmlFor={id} className="cursor-pointer">
              <div className="flex items-start gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-16 w-16 rounded-full object-cover"
                    data-testid="img-candidate-photo"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-display text-2xl font-bold text-primary">
                      {name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold" data-testid="text-candidate-name">
                    {name}
                  </h3>
                  <Badge variant="secondary" className="mt-1" data-testid="badge-position">
                    {position}
                  </Badge>
                </div>
              </div>
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <h4 className="text-sm font-semibold mb-1">Manifesto</h4>
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-manifesto">
            {manifesto}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-1">Experience</h4>
          <p className="text-sm text-muted-foreground" data-testid="text-experience">{experience}</p>
        </div>
      </CardContent>
    </Card>
  );
}
