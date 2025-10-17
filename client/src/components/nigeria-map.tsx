import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Calendar, Megaphone, TrendingUp, MapPin } from "lucide-react";

interface StateData {
  stateId: string;
  name: string;
  code: string;
  memberCount: number;
  activeMembers: number;
  upcomingEvents: number;
  activeCampaigns: number;
  lgasCovered: number;
  wardsCovered: number;
}

interface NigeriaMapProps {
  mode?: 'members' | 'events' | 'campaigns' | 'activity';
  onStateClick?: (stateId: string, stateName: string) => void;
  highlightStates?: string[];
  showLegend?: boolean;
}

type MapMode = 'members' | 'events' | 'campaigns' | 'activity';

const statePositions: Record<string, { x: number; y: number; width: number; height: number }> = {
  // Northwest zone
  "Sokoto": { x: 50, y: 50, width: 100, height: 80 },
  "Zamfara": { x: 160, y: 50, width: 90, height: 80 },
  "Katsina": { x: 260, y: 30, width: 110, height: 90 },
  "Jigawa": { x: 380, y: 40, width: 100, height: 80 },
  "Kebbi": { x: 50, y: 140, width: 100, height: 90 },
  
  // Northeast zone
  "Kano": { x: 380, y: 130, width: 90, height: 80 },
  "Borno": { x: 590, y: 50, width: 140, height: 120 },
  "Yobe": { x: 480, y: 50, width: 100, height: 110 },
  "Bauchi": { x: 380, y: 220, width: 120, height: 90 },
  "Gombe": { x: 510, y: 220, width: 90, height: 80 },
  "Adamawa": { x: 610, y: 180, width: 110, height: 110 },
  
  // North central zone
  "Kaduna": { x: 260, y: 130, width: 110, height: 110 },
  "Niger": { x: 150, y: 240, width: 120, height: 120 },
  "FCT": { x: 280, y: 250, width: 60, height: 60 },
  "Plateau": { x: 350, y: 320, width: 90, height: 80 },
  "Nasarawa": { x: 340, y: 320, width: 90, height: 70 },
  "Benue": { x: 350, y: 400, width: 110, height: 90 },
  "Kogi": { x: 250, y: 370, width: 90, height: 100 },
  
  // Southwest zone
  "Kwara": { x: 150, y: 370, width: 90, height: 80 },
  "Oyo": { x: 80, y: 460, width: 100, height: 90 },
  "Osun": { x: 100, y: 560, width: 80, height: 70 },
  "Ogun": { x: 100, y: 640, width: 90, height: 80 },
  "Lagos": { x: 50, y: 640, width: 40, height: 80 },
  "Ondo": { x: 200, y: 560, width: 100, height: 90 },
  "Ekiti": { x: 190, y: 480, width: 80, height: 70 },
  
  // Southeast zone
  "Enugu": { x: 340, y: 500, width: 80, height: 70 },
  "Ebonyi": { x: 430, y: 490, width: 70, height: 80 },
  "Anambra": { x: 320, y: 580, width: 80, height: 70 },
  "Abia": { x: 340, y: 660, width: 80, height: 70 },
  "Imo": { x: 320, y: 660, width: 80, height: 70 },
  
  // South south zone
  "Cross River": { x: 510, y: 580, width: 90, height: 130 },
  "Akwa Ibom": { x: 430, y: 650, width: 70, height: 80 },
  "Rivers": { x: 330, y: 740, width: 90, height: 80 },
  "Bayelsa": { x: 250, y: 740, width: 70, height: 80 },
  "Delta": { x: 240, y: 660, width: 80, height: 70 },
  "Edo": { x: 240, y: 580, width: 90, height: 70 },
  "Taraba": { x: 510, y: 310, width: 100, height: 110 },
};

export function NigeriaMap({ 
  mode = 'members', 
  onStateClick, 
  highlightStates = [],
  showLegend = true 
}: NigeriaMapProps) {
  const [selectedMode, setSelectedMode] = useState<MapMode>(mode);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ states: StateData[] }>({
    queryKey: ['/api/analytics/map-data'],
  });

  const getColorIntensity = (state: StateData): string => {
    if (!state) return 'hsl(220 13% 88%)';

    let value = 0;
    let max = 1;

    switch (selectedMode) {
      case 'members':
        value = state.memberCount;
        max = Math.max(...(data?.states.map(s => s.memberCount) || [1]));
        break;
      case 'events':
        value = state.upcomingEvents;
        max = Math.max(...(data?.states.map(s => s.upcomingEvents) || [1]));
        break;
      case 'campaigns':
        value = state.activeCampaigns;
        max = Math.max(...(data?.states.map(s => s.activeCampaigns) || [1]));
        break;
      case 'activity':
        value = state.memberCount + state.upcomingEvents + state.activeCampaigns;
        max = Math.max(...(data?.states.map(s => 
          s.memberCount + s.upcomingEvents + s.activeCampaigns
        ) || [1]));
        break;
    }

    if (value === 0) return 'hsl(220 13% 88%)';
    
    const intensity = Math.min(value / max, 1);
    const lightness = 65 - (intensity * 30);
    
    return `hsl(142 ${65}% ${lightness}%)`;
  };

  const getStateData = (stateName: string): StateData | undefined => {
    return data?.states.find(s => s.name === stateName);
  };

  const handleStateClick = (stateName: string) => {
    const state = getStateData(stateName);
    if (state && onStateClick) {
      onStateClick(state.stateId, state.name);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[600px] w-full" />
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="nigeria-map">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">View by:</span>
        <Button
          variant={selectedMode === 'members' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMode('members')}
          data-testid="button-mode-members"
        >
          <Users className="h-4 w-4 mr-1" />
          Members
        </Button>
        <Button
          variant={selectedMode === 'events' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMode('events')}
          data-testid="button-mode-events"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Events
        </Button>
        <Button
          variant={selectedMode === 'campaigns' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMode('campaigns')}
          data-testid="button-mode-campaigns"
        >
          <Megaphone className="h-4 w-4 mr-1" />
          Campaigns
        </Button>
        <Button
          variant={selectedMode === 'activity' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMode('activity')}
          data-testid="button-mode-activity"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Activity
        </Button>
      </div>

      <Card className="p-4">
        <TooltipProvider>
          <svg
            viewBox="0 0 800 850"
            className="w-full h-auto"
            data-testid="svg-nigeria-map"
          >
            {Object.entries(statePositions).map(([stateName, pos]) => {
              const stateData = getStateData(stateName);
              const fillColor = stateData ? getColorIntensity(stateData) : 'hsl(220 13% 88%)';
              const isHighlighted = highlightStates.includes(stateName);
              const isHovered = hoveredState === stateName;

              return (
                <Tooltip key={stateName}>
                  <TooltipTrigger asChild>
                    <g
                      onMouseEnter={() => setHoveredState(stateName)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick(stateName)}
                      className="cursor-pointer transition-all duration-200"
                      data-testid={`state-${stateName.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <rect
                        x={pos.x}
                        y={pos.y}
                        width={pos.width}
                        height={pos.height}
                        fill={fillColor}
                        stroke={isHighlighted ? 'hsl(355 75% 48%)' : 'hsl(220 10% 28%)'}
                        strokeWidth={isHighlighted ? 3 : 1}
                        opacity={isHovered ? 0.8 : 1}
                        rx={4}
                      />
                      <text
                        x={pos.x + pos.width / 2}
                        y={pos.y + pos.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium pointer-events-none"
                        fill="hsl(220 15% 12%)"
                      >
                        {stateName}
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-semibold">{stateName}</span>
                      </div>
                      {stateData && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{stateData.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {stateData.activeMembers} active
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{stateData.upcomingEvents} events</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Megaphone className="h-3 w-3" />
                            <span>{stateData.activeCampaigns} campaigns</span>
                          </div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {stateData.lgasCovered} LGAs, {stateData.wardsCovered} wards covered
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </TooltipProvider>
      </Card>

      {showLegend && (
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(142 65% 65%)' }} />
                <span className="text-xs">Low</span>
              </div>
              <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(142 65% 50%)' }} />
              <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(142 65% 35%)' }} />
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(142 65% 35%)' }} />
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <div className="h-4 w-4 rounded bg-muted" />
                <span className="text-xs">No data</span>
              </div>
            </div>
            <Badge variant="outline" data-testid="text-total-states">
              {data?.states.length || 0} States
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
