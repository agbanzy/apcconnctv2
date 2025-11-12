import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Calendar, Megaphone, TrendingUp, MapPin, Award, Activity } from "lucide-react";

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
  "Sokoto": { x: 50, y: 50, width: 100, height: 80 },
  "Zamfara": { x: 160, y: 50, width: 90, height: 80 },
  "Katsina": { x: 260, y: 30, width: 110, height: 90 },
  "Jigawa": { x: 380, y: 40, width: 100, height: 80 },
  "Kebbi": { x: 50, y: 140, width: 100, height: 90 },
  "Kano": { x: 380, y: 130, width: 90, height: 80 },
  "Borno": { x: 590, y: 50, width: 140, height: 120 },
  "Yobe": { x: 480, y: 50, width: 100, height: 110 },
  "Bauchi": { x: 380, y: 220, width: 120, height: 90 },
  "Gombe": { x: 510, y: 220, width: 90, height: 80 },
  "Adamawa": { x: 610, y: 180, width: 110, height: 110 },
  "Kaduna": { x: 260, y: 130, width: 110, height: 110 },
  "Niger": { x: 150, y: 240, width: 120, height: 120 },
  "FCT": { x: 280, y: 250, width: 60, height: 60 },
  "Plateau": { x: 350, y: 320, width: 90, height: 80 },
  "Nasarawa": { x: 340, y: 320, width: 90, height: 70 },
  "Benue": { x: 350, y: 400, width: 110, height: 90 },
  "Kogi": { x: 250, y: 370, width: 90, height: 100 },
  "Kwara": { x: 150, y: 370, width: 90, height: 80 },
  "Oyo": { x: 80, y: 460, width: 100, height: 90 },
  "Osun": { x: 100, y: 560, width: 80, height: 70 },
  "Ogun": { x: 100, y: 640, width: 90, height: 80 },
  "Lagos": { x: 50, y: 640, width: 40, height: 80 },
  "Ondo": { x: 200, y: 560, width: 100, height: 90 },
  "Ekiti": { x: 190, y: 480, width: 80, height: 70 },
  "Enugu": { x: 340, y: 500, width: 80, height: 70 },
  "Ebonyi": { x: 430, y: 490, width: 70, height: 80 },
  "Anambra": { x: 320, y: 580, width: 80, height: 70 },
  "Abia": { x: 340, y: 660, width: 80, height: 70 },
  "Imo": { x: 320, y: 660, width: 80, height: 70 },
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
  const [touchedState, setTouchedState] = useState<string | null>(null);
  const [focusedState, setFocusedState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        max = Math.max(...(data?.states?.map(s => s.memberCount) || [1]));
        break;
      case 'events':
        value = state.upcomingEvents;
        max = Math.max(...(data?.states?.map(s => s.upcomingEvents) || [1]));
        break;
      case 'campaigns':
        value = state.activeCampaigns;
        max = Math.max(...(data?.states?.map(s => s.activeCampaigns) || [1]));
        break;
      case 'activity':
        value = state.memberCount + state.upcomingEvents + state.activeCampaigns;
        max = Math.max(...(data?.states?.map(s => 
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
    return data?.states?.find(s => s.name === stateName);
  };

  const handleStateClick = (stateName: string) => {
    const state = getStateData(stateName);
    if (state && onStateClick) {
      onStateClick(state.stateId, state.name);
    }
  };

  const handleStateTouchStart = (stateName: string) => {
    setTouchedState(stateName);
    setHoveredState(stateName);
    const stateData = getStateData(stateName);
    setSelectedState(stateData || null);
  };

  const handleStateTouchEnd = () => {
    setTimeout(() => {
      setTouchedState(null);
      setHoveredState(null);
    }, 2000);
  };

  const handleStateInteraction = (stateName: string) => {
    const stateData = getStateData(stateName);
    handleStateClick(stateName);
    setSelectedState(stateData || null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[600px] w-full" />
      </Card>
    );
  }

  const maxValue = Math.max(...(data?.states?.map(s => {
    switch (selectedMode) {
      case 'members':
        return s.memberCount;
      case 'events':
        return s.upcomingEvents;
      case 'campaigns':
        return s.activeCampaigns;
      case 'activity':
        return s.memberCount + s.upcomingEvents + s.activeCampaigns;
      default:
        return 0;
    }
  }) || [1]));

  return (
    <div className="space-y-6" data-testid="nigeria-map">
      {/* Mode Selection Buttons */}
      <motion.div 
        className="flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-sm font-medium text-muted-foreground">View by:</span>
        {[
          { mode: 'members', icon: Users, label: 'Members' },
          { mode: 'events', icon: Calendar, label: 'Events' },
          { mode: 'campaigns', icon: Megaphone, label: 'Campaigns' },
          { mode: 'activity', icon: TrendingUp, label: 'Activity' }
        ].map(({ mode: m, icon: Icon, label }) => (
          <Button
            key={m}
            variant={selectedMode === m ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMode(m as MapMode)}
            data-testid={`button-mode-${m}`}
            className="transition-all duration-200"
          >
            <Icon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </motion.div>

      {/* Enhanced Map with Animations */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-4 overflow-hidden">
          <TooltipProvider delayDuration={100}>
            <svg
              viewBox="0 0 800 850"
              className="w-full h-auto touch-none"
              data-testid="svg-nigeria-map"
              style={{ maxHeight: '80vh' }}
            >
              <defs>
                <filter id="shadow-hover" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
                  <feOffset dx="0" dy="1" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.2"/>
                  </feComponentTransfer>
                  <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                  </feMerge>
                </filter>
              </defs>

              <AnimatePresence mode="wait">
                {Object.entries(statePositions).map(([stateName, pos]) => {
                  const stateData = getStateData(stateName);
                  const fillColor = stateData ? getColorIntensity(stateData) : 'hsl(220 13% 88%)';
                  const isHighlighted = highlightStates.includes(stateName);
                  const isHovered = hoveredState === stateName;
                  const isTouched = touchedState === stateName;
                  const isFocused = focusedState === stateName;
                  const isInteractive = isFocused || isHovered || isTouched;

                  return (
                    <Tooltip key={stateName}>
                      <TooltipTrigger asChild>
                        <g
                          tabIndex={0}
                          role="button"
                          aria-label={`${stateName}: ${stateData?.memberCount || 0} members`}
                          onFocus={() => {
                            setFocusedState(stateName);
                            const state = getStateData(stateName);
                            setSelectedState(state || null);
                          }}
                          onBlur={() => setFocusedState(null)}
                          onMouseEnter={() => setHoveredState(stateName)}
                          onMouseLeave={() => setHoveredState(null)}
                          onTouchStart={() => handleStateTouchStart(stateName)}
                          onTouchEnd={handleStateTouchEnd}
                          onClick={() => handleStateInteraction(stateName)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleStateInteraction(stateName);
                            }
                          }}
                          className="cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          data-testid={`state-${stateName.toLowerCase().replace(/\s+/g, '-')}`}
                          style={{
                            filter: isInteractive ? 'url(#shadow-hover)' : 'none'
                          }}
                        >
                          <rect
                            x={pos.x}
                            y={pos.y}
                            width={pos.width}
                            height={pos.height}
                            fill={fillColor}
                            stroke={
                              isHighlighted ? 'hsl(355 75% 48%)' : 
                              isFocused ? 'hsl(142 65% 35%)' :
                              isHovered ? 'hsl(142 65% 45%)' :
                              'hsl(220 10% 28%)'
                            }
                            strokeWidth={
                              isHighlighted ? 3 : 
                              (isFocused || isHovered) ? 2.5 : 
                              1
                            }
                            rx={6}
                            className="transition-all duration-200"
                            style={{
                              transform: isInteractive && !prefersReducedMotion ? 'scale(1.02)' : 'scale(1)',
                              opacity: isInteractive ? 0.9 : 1
                            }}
                          />
                          <text
                            x={pos.x + pos.width / 2}
                            y={pos.y + pos.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs font-semibold pointer-events-none select-none transition-all duration-200"
                            fill={isInteractive ? 'hsl(0 0% 0%)' : 'hsl(220 15% 12%)'}
                            style={{
                              fontSize: isInteractive ? '13px' : '11px'
                            }}
                          >
                            {stateName}
                          </text>
                        </g>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-sm border-2 p-4 bg-background/95 backdrop-blur-md"
                        sideOffset={8}
                      >
                        <motion.div 
                          className="space-y-3"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center gap-2 border-b pb-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span className="font-bold text-lg">{stateName}</span>
                            {stateData && stateData.code && (
                              <Badge variant="outline" className="text-xs">{stateData.code}</Badge>
                            )}
                          </div>
                          {stateData ? (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex flex-col gap-1 p-2 rounded-md bg-primary/5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>Total Members</span>
                                </div>
                                <span className="text-lg font-bold text-primary">
                                  {stateData.memberCount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 p-2 rounded-md bg-accent/5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Activity className="h-3 w-3" />
                                  <span>Active Now</span>
                                </div>
                                <span className="text-lg font-bold text-accent">
                                  {stateData.activeMembers.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 p-2 rounded-md bg-primary/5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>Events</span>
                                </div>
                                <span className="text-base font-semibold">
                                  {stateData.upcomingEvents}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 p-2 rounded-md bg-accent/5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Megaphone className="h-3 w-3" />
                                  <span>Campaigns</span>
                                </div>
                                <span className="text-base font-semibold">
                                  {stateData.activeCampaigns}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-1">
                                <span>{stateData.lgasCovered} LGAs covered</span>
                                <span>{stateData.wardsCovered} wards covered</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No data available</p>
                          )}
                        </motion.div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </AnimatePresence>
            </svg>
          </TooltipProvider>
        </Card>
      </motion.div>

      {/* Selected State Card - Accessible Alternative to Tooltips */}
      {selectedState && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
        >
          <Card className="p-4" data-testid="card-selected-state">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {selectedState.name} State
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedState(null)}
                data-testid="button-close-selected-state"
              >
                Close
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Members</div>
                <div className="text-2xl font-bold text-primary">{selectedState.memberCount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active Members</div>
                <div className="text-2xl font-bold text-accent">{selectedState.activeMembers.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Events</div>
                <div className="text-2xl font-bold">{selectedState.upcomingEvents}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Campaigns</div>
                <div className="text-2xl font-bold">{selectedState.activeCampaigns}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">LGAs</div>
                <div className="text-2xl font-bold">{selectedState.lgasCovered}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Wards</div>
                <div className="text-2xl font-bold">{selectedState.wardsCovered}</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Enhanced Legend */}
      {showLegend && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Color Intensity Scale:</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedMode === 'members' ? 'Members' :
                       selectedMode === 'events' ? 'Events' :
                       selectedMode === 'campaigns' ? 'Campaigns' : 'Overall Activity'}
                    </Badge>
                  </div>
                  
                  {/* Gradient Legend */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div 
                        className="h-6 w-12 rounded-l-md border border-border" 
                        style={{ backgroundColor: 'hsl(220 13% 88%)' }} 
                      />
                      <div 
                        className="h-6 w-12 border-y border-border" 
                        style={{ backgroundColor: 'hsl(142 65% 65%)' }} 
                      />
                      <div 
                        className="h-6 w-12 border-y border-border" 
                        style={{ backgroundColor: 'hsl(142 65% 50%)' }} 
                      />
                      <div 
                        className="h-6 w-12 border-y border-border" 
                        style={{ backgroundColor: 'hsl(142 65% 42%)' }} 
                      />
                      <div 
                        className="h-6 w-12 rounded-r-md border border-border" 
                        style={{ backgroundColor: 'hsl(142 65% 35%)' }} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground max-w-xs">
                    <span>None/Low</span>
                    <span className="font-medium">Medium</span>
                    <span>High ({maxValue.toLocaleString()})</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <div className="text-right">
                      <div className="text-2xl font-bold" data-testid="text-total-states">
                        {data?.states?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">States</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Interaction Hint */}
              <div className="md:hidden text-xs text-muted-foreground text-center py-2 border-t">
                Tap on any state to view detailed statistics
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
