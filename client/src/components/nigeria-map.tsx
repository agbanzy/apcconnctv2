import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, Megaphone, TrendingUp, MapPin, Award, X, Vote, Newspaper, ClipboardList, Landmark, Building2 } from "lucide-react";
import { NIGERIA_STATE_PATHS, NIGERIA_MAP_VIEWBOX, STATE_NAME_ALIASES } from "@/lib/nigeria-svg-paths";

interface StateData {
  stateId: string;
  name: string;
  code: string;
  totalLgas: number;
  totalWards: number;
  memberCount: number;
  activeMembers: number;
  upcomingEvents: number;
  activeCampaigns: number;
  lgasCovered: number;
  wardsCovered: number;
  pollingUnitsCount: number;
  newsCount: number;
  tasksCount: number;
  senatorialDistrictsCount: number;
  federalConstituenciesCount: number;
  generalElectionsCount: number;
}

interface ElectoralDetail {
  senatorialDistricts: Array<{ id: string; code: string; districtName: string }>;
  federalConstituencies: Array<{ id: string; code: string; name: string }>;
  elections: Array<{ id: string; title: string; position: string; status: string; electionDate: string; year: number }>;
}

interface NigeriaMapProps {
  mode?: MapMode;
  onStateClick?: (stateId: string, stateName: string) => void;
  highlightStates?: string[];
  showLegend?: boolean;
}

type MapMode = 'members' | 'events' | 'campaigns' | 'activity' | 'polling' | 'news' | 'tasks' | 'elections';

function findStateData(states: StateData[] | undefined, svgName: string): StateData | undefined {
  if (!states) return undefined;
  const aliases = STATE_NAME_ALIASES[svgName] || [svgName];
  return states.find(s => aliases.some(a => a.toLowerCase() === s.name.toLowerCase()));
}

export function NigeriaMap({ 
  mode = 'members', 
  onStateClick, 
  highlightStates = [],
  showLegend = true 
}: NigeriaMapProps) {
  const [selectedMode, setSelectedMode] = useState<MapMode>(mode);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; name: string; data: StateData | undefined } | null>(null);
  const [showElectoralDetail, setShowElectoralDetail] = useState(false);

  const { data: rawData, isLoading } = useQuery<{ success: boolean; data: { states: StateData[] } }>({
    queryKey: ['/api/analytics/map-data'],
  });
  const statesData = rawData?.data?.states;

  const { data: electoralData } = useQuery<{ success: boolean; data: ElectoralDetail }>({
    queryKey: ['/api/analytics/state-electoral', selectedState?.stateId],
    enabled: !!selectedState?.stateId && showElectoralDetail,
  });

  const getModeValue = useCallback((s: StateData): number => {
    switch (selectedMode) {
      case 'members': return s.memberCount;
      case 'events': return s.upcomingEvents;
      case 'campaigns': return s.activeCampaigns;
      case 'polling': return s.pollingUnitsCount || 0;
      case 'news': return s.newsCount || 0;
      case 'tasks': return s.tasksCount || 0;
      case 'elections': return (s.senatorialDistrictsCount || 0) + (s.federalConstituenciesCount || 0) + (s.generalElectionsCount || 0);
      case 'activity': return s.memberCount + s.upcomingEvents + s.activeCampaigns + (s.tasksCount || 0);
      default: return 0;
    }
  }, [selectedMode]);

  const maxValue = useMemo(() => {
    if (!statesData?.length) return 1;
    return Math.max(1, ...statesData.map(getModeValue));
  }, [statesData, getModeValue]);

  const getColorIntensity = useCallback((stateData: StateData | undefined): string => {
    if (!stateData) return 'hsl(220, 13%, 88%)';
    const value = getModeValue(stateData);
    if (value === 0) return 'hsl(220, 13%, 88%)';
    const intensity = Math.min(value / maxValue, 1);
    if (selectedMode === 'elections') {
      const lightness = 60 - (intensity * 25);
      return `hsl(210, 70%, ${lightness}%)`;
    }
    const lightness = 65 - (intensity * 30);
    return `hsl(142, 65%, ${lightness}%)`;
  }, [getModeValue, maxValue, selectedMode]);

  const handleStateClick = useCallback((svgName: string) => {
    const stateData = findStateData(statesData, svgName);
    setSelectedState(stateData || null);
    setShowElectoralDetail(false);
    if (stateData && onStateClick) {
      onStateClick(stateData.stateId, stateData.name);
    }
  }, [statesData, onStateClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>, svgName: string) => {
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      name: svgName,
      data: findStateData(statesData, svgName),
    });
  }, [statesData]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[500px] w-full" data-testid="skeleton-map" />
      </Card>
    );
  }

  const elDetail = electoralData?.data;

  return (
    <div className="space-y-4" data-testid="nigeria-map">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">View by:</span>
        {([
          { mode: 'members' as MapMode, icon: Users, label: 'Members' },
          { mode: 'events' as MapMode, icon: Calendar, label: 'Events' },
          { mode: 'campaigns' as MapMode, icon: Megaphone, label: 'Campaigns' },
          { mode: 'polling' as MapMode, icon: Vote, label: 'Polling Units' },
          { mode: 'elections' as MapMode, icon: Landmark, label: 'Elections' },
          { mode: 'news' as MapMode, icon: Newspaper, label: 'News' },
          { mode: 'tasks' as MapMode, icon: ClipboardList, label: 'Tasks' },
          { mode: 'activity' as MapMode, icon: TrendingUp, label: 'Activity' },
        ]).map(({ mode: m, icon: Icon, label }) => (
          <Button
            key={m}
            variant={selectedMode === m ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMode(m)}
            data-testid={`button-mode-${m}`}
          >
            <Icon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      <Card className="p-2 sm:p-4">
        <div className="relative">
          <svg
            viewBox={NIGERIA_MAP_VIEWBOX}
            className="w-full h-auto"
            data-testid="svg-nigeria-map"
            style={{ maxHeight: '70vh' }}
            role="img"
            aria-label="Interactive map of Nigeria showing state-level data"
          >
            <defs>
              <filter id="state-glow" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feFlood floodColor="hsl(142, 65%, 45%)" floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {Object.entries(NIGERIA_STATE_PATHS).map(([svgName, pathData]) => {
              const stateData = findStateData(statesData, svgName);
              const fillColor = getColorIntensity(stateData);
              const isHovered = hoveredState === svgName;
              const isHighlighted = highlightStates.some(h => {
                const aliases = STATE_NAME_ALIASES[svgName] || [svgName];
                return aliases.some(a => a.toLowerCase() === h.toLowerCase());
              });

              return (
                <path
                  key={pathData.id}
                  d={pathData.d}
                  fill={fillColor}
                  stroke={
                    isHighlighted ? 'hsl(355, 75%, 48%)' :
                    isHovered ? 'hsl(142, 65%, 35%)' :
                    'hsl(220, 10%, 40%)'
                  }
                  strokeWidth={isHighlighted ? 2.5 : isHovered ? 2 : 0.5}
                  className="cursor-pointer outline-none"
                  style={{
                    transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s',
                    filter: isHovered ? 'url(#state-glow)' : 'none',
                  }}
                  strokeDasharray={isHovered && !isHighlighted ? '4 2' : 'none'}
                  onMouseEnter={() => setHoveredState(svgName)}
                  onMouseMove={(e) => handleMouseMove(e, svgName)}
                  onMouseLeave={() => {
                    setHoveredState(null);
                    setTooltipInfo(null);
                  }}
                  onClick={() => handleStateClick(svgName)}
                  onTouchStart={() => {
                    setHoveredState(svgName);
                    const sd = findStateData(statesData, svgName);
                    setTooltipInfo({
                      x: pathData.labelX,
                      y: pathData.labelY - 20,
                      name: svgName,
                      data: sd,
                    });
                    handleStateClick(svgName);
                  }}
                  onTouchEnd={() => {
                    setTimeout(() => {
                      setHoveredState(null);
                      setTooltipInfo(null);
                    }, 2000);
                  }}
                  data-testid={`state-${svgName.toLowerCase().replace(/\s+/g, '-')}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${svgName}: ${stateData?.memberCount || 0} members`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStateClick(svgName);
                    }
                  }}
                  onFocus={() => {
                    setHoveredState(svgName);
                    const sd = findStateData(statesData, svgName);
                    setTooltipInfo({
                      x: pathData.labelX,
                      y: pathData.labelY - 20,
                      name: svgName,
                      data: sd,
                    });
                  }}
                  onBlur={() => {
                    setHoveredState(null);
                    setTooltipInfo(null);
                  }}
                />
              );
            })}

            {Object.entries(NIGERIA_STATE_PATHS).map(([svgName, pathData]) => {
              const abbrev = svgName === "Federal Capital Territory" ? "FCT" :
                             svgName === "Cross River" ? "C.River" :
                             svgName === "Akwa Ibom" ? "A.Ibom" :
                             svgName === "Nassarawa" ? "Nasar." :
                             svgName;
              const fontSize = ["Lagos", "Federal Capital Territory", "Ebonyi", "Anambra", "Imo", "Abia", "Bayelsa", "Ekiti"].includes(svgName) ? 6 : 8;
              return (
                <text
                  key={`label-${pathData.id}`}
                  x={pathData.labelX}
                  y={pathData.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  fill="hsl(220, 15%, 12%)"
                  fontSize={fontSize}
                  fontWeight={600}
                  paintOrder="stroke"
                  stroke="hsla(0, 0%, 100%, 0.7)"
                  strokeWidth={2}
                >
                  {abbrev}
                </text>
              );
            })}
          </svg>

          {tooltipInfo && hoveredState && (
            <div
              className="absolute z-50 pointer-events-none bg-popover border border-border rounded-md shadow-lg p-3 min-w-[200px]"
              style={{
                left: Math.min(tooltipInfo.x, (typeof window !== 'undefined' ? window.innerWidth * 0.6 : 400)),
                top: tooltipInfo.y,
                transform: 'translate(-50%, -100%)',
              }}
              data-testid="tooltip-state-info"
            >
              <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">{tooltipInfo.name}</span>
                {tooltipInfo.data?.code && (
                  <Badge variant="outline" className="text-xs">{tooltipInfo.data.code}</Badge>
                )}
              </div>
              {tooltipInfo.data ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Members</span>
                    <div className="font-bold text-sm" data-testid="tooltip-member-count">{tooltipInfo.data.memberCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active</span>
                    <div className="font-bold text-sm" data-testid="tooltip-active-count">{tooltipInfo.data.activeMembers.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Events</span>
                    <div className="font-bold text-sm" data-testid="tooltip-events-count">{tooltipInfo.data.upcomingEvents}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campaigns</span>
                    <div className="font-bold text-sm" data-testid="tooltip-campaigns-count">{tooltipInfo.data.activeCampaigns}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Polling Units</span>
                    <div className="font-bold text-sm" data-testid="tooltip-polling-count">{(tooltipInfo.data.pollingUnitsCount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sen. Districts</span>
                    <div className="font-bold text-sm" data-testid="tooltip-districts-count">{tooltipInfo.data.senatorialDistrictsCount || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fed. Constituencies</span>
                    <div className="font-bold text-sm" data-testid="tooltip-constituencies-count">{tooltipInfo.data.federalConstituenciesCount || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Elections</span>
                    <div className="font-bold text-sm" data-testid="tooltip-elections-count">{tooltipInfo.data.generalElectionsCount || 0}</div>
                  </div>
                  <div className="col-span-2 text-muted-foreground border-t border-border pt-1 mt-1" data-testid="tooltip-coverage">
                    {tooltipInfo.data.lgasCovered} LGAs, {tooltipInfo.data.wardsCovered} wards
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {selectedState && (
        <Card className="p-4" data-testid="card-selected-state">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {selectedState.name}
              {selectedState.code && <Badge variant="outline">{selectedState.code}</Badge>}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSelectedState(null); setShowElectoralDetail(false); }}
              data-testid="button-close-selected-state"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Members</div>
              <div className="text-2xl font-bold text-primary" data-testid="text-member-count">{selectedState.memberCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active Members</div>
              <div className="text-2xl font-bold" data-testid="text-active-members">{selectedState.activeMembers.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Polling Units</div>
              <div className="text-2xl font-bold" data-testid="text-polling-units">{(selectedState.pollingUnitsCount || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Events</div>
              <div className="text-2xl font-bold" data-testid="text-events-count">{selectedState.upcomingEvents}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Campaigns</div>
              <div className="text-2xl font-bold" data-testid="text-campaigns-count">{selectedState.activeCampaigns}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">News Posts</div>
              <div className="text-2xl font-bold" data-testid="text-news-count">{selectedState.newsCount || 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LGAs</div>
              <div className="text-2xl font-bold" data-testid="text-lgas-count">{selectedState.totalLgas}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Wards</div>
              <div className="text-2xl font-bold" data-testid="text-wards-count">{selectedState.totalWards}</div>
            </div>
          </div>

          <div className="border-t border-border mt-4 pt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                Electoral Geography
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowElectoralDetail(!showElectoralDetail)}
                data-testid="button-toggle-electoral-detail"
              >
                {showElectoralDetail ? 'Hide Details' : 'View Details'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Senatorial Districts</div>
                <div className="text-xl font-bold" data-testid="text-senatorial-count">{selectedState.senatorialDistrictsCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fed. Constituencies</div>
                <div className="text-xl font-bold" data-testid="text-constituency-count">{selectedState.federalConstituenciesCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active Elections</div>
                <div className="text-xl font-bold" data-testid="text-elections-count">{selectedState.generalElectionsCount || 0}</div>
              </div>
            </div>
          </div>

          {showElectoralDetail && elDetail && (
            <div className="border-t border-border mt-4 pt-4 space-y-4" data-testid="electoral-detail-panel">
              {elDetail.senatorialDistricts.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    Senatorial Districts ({elDetail.senatorialDistricts.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {elDetail.senatorialDistricts.map((d) => (
                      <Badge key={d.id} variant="secondary" data-testid={`badge-district-${d.id}`}>
                        {d.districtName}
                        <span className="ml-1 text-muted-foreground">({d.code})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {elDetail.federalConstituencies.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Federal Constituencies ({elDetail.federalConstituencies.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {elDetail.federalConstituencies.map((c) => (
                      <Badge key={c.id} variant="outline" data-testid={`badge-constituency-${c.id}`}>
                        {c.name}
                        <span className="ml-1 text-muted-foreground">({c.code})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {elDetail.elections.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Vote className="h-3 w-3" />
                    Elections ({elDetail.elections.length})
                  </h5>
                  <div className="space-y-1">
                    {elDetail.elections.map((el) => (
                      <div key={el.id} className="flex items-center justify-between gap-2 text-sm py-1" data-testid={`row-election-${el.id}`}>
                        <span className="truncate">{el.title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{el.position}</Badge>
                          <Badge
                            variant={el.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {el.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {elDetail.senatorialDistricts.length === 0 && elDetail.federalConstituencies.length === 0 && elDetail.elections.length === 0 && (
                <p className="text-sm text-muted-foreground">No electoral geography data available for this state.</p>
              )}
            </div>
          )}
        </Card>
      )}

      {showLegend && (
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Intensity:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedMode === 'members' ? 'Members' :
                   selectedMode === 'events' ? 'Events' :
                   selectedMode === 'campaigns' ? 'Campaigns' :
                   selectedMode === 'polling' ? 'Polling Units' :
                   selectedMode === 'elections' ? 'Electoral Districts' :
                   selectedMode === 'news' ? 'News Posts' :
                   selectedMode === 'tasks' ? 'Tasks' : 'Overall Activity'}
                </Badge>
              </div>
              <div className="flex items-center gap-0.5">
                {[88, 65, 50, 42, 35].map((l, i) => (
                  <div
                    key={i}
                    className={`h-5 w-10 ${i === 0 ? 'rounded-l-md' : ''} ${i === 4 ? 'rounded-r-md' : ''}`}
                    style={{ backgroundColor: l === 88 ? 'hsl(220, 13%, 88%)' : selectedMode === 'elections' ? `hsl(210, 70%, ${l}%)` : `hsl(142, 65%, ${l}%)` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground" style={{ width: '200px' }}>
                <span>None</span>
                <span>Medium</span>
                <span>{maxValue.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <div className="text-right">
                <div className="text-2xl font-bold" data-testid="text-total-states">
                  {statesData?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">States</div>
              </div>
            </div>
          </div>
          <div className="md:hidden text-xs text-muted-foreground text-center pt-2 border-t mt-3">
            Tap on any state to view detailed statistics
          </div>
        </Card>
      )}
    </div>
  );
}
