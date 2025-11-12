import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { api } from '@/lib/api';

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
}

const statePositions: Record<string, { x: number; y: number; width: number; height: number }> = {
  "Lagos": { x: 10, y: 520, width: 30, height: 40 },
  "Ogun": { x: 50, y: 520, width: 40, height: 40 },
  "Oyo": { x: 10, y: 440, width: 50, height: 70 },
  "Osun": { x: 60, y: 460, width: 40, height: 50 },
  "Ondo": { x: 100, y: 460, width: 50, height: 50 },
  "Ekiti": { x: 100, y: 410, width: 40, height: 40 },
  "Kwara": { x: 70, y: 360, width: 50, height: 40 },
  "Kogi": { x: 120, y: 360, width: 50, height: 50 },
  "Niger": { x: 70, y: 240, width: 60, height: 110 },
  "FCT": { x: 140, y: 280, width: 30, height: 30 },
  "Nasarawa": { x: 170, y: 320, width: 45, height: 35 },
  "Plateau": { x: 170, y: 280, width: 45, height: 35 },
  "Benue": { x: 170, y: 360, width: 55, height: 45 },
  "Enugu": { x: 170, y: 410, width: 40, height: 35 },
  "Ebonyi": { x: 215, y: 410, width: 35, height: 40 },
  "Anambra": { x: 160, y: 460, width: 40, height: 35 },
  "Imo": { x: 160, y: 500, width: 40, height: 35 },
  "Abia": { x: 170, y: 540, width: 40, height: 35 },
  "Akwa Ibom": { x: 215, y: 540, width: 35, height: 40 },
  "Cross River": { x: 255, y: 480, width: 45, height: 100 },
  "Rivers": { x: 165, y: 580, width: 45, height: 40 },
  "Bayelsa": { x: 125, y: 580, width: 35, height: 40 },
  "Delta": { x: 120, y: 540, width: 40, height: 35 },
  "Edo": { x: 120, y: 480, width: 45, height: 35 },
  "Kaduna": { x: 130, y: 160, width: 55, height: 55 },
  "Kano": { x: 190, y: 140, width: 45, height: 40 },
  "Katsina": { x: 130, y: 80, width: 55, height: 70 },
  "Jigawa": { x: 190, y: 90, width: 50, height: 40 },
  "Zamfara": { x: 80, y: 90, width: 45, height: 40 },
  "Sokoto": { x: 25, y: 90, width: 50, height: 40 },
  "Kebbi": { x: 25, y: 140, width: 50, height: 45 },
  "Bauchi": { x: 190, y: 190, width: 60, height: 45 },
  "Gombe": { x: 255, y: 220, width: 45, height: 40 },
  "Yobe": { x: 240, y: 120, width: 50, height: 55 },
  "Borno": { x: 295, y: 100, width: 70, height: 60 },
  "Adamawa": { x: 305, y: 180, width: 55, height: 55 },
  "Taraba": { x: 255, y: 265, width: 50, height: 55 },
};

const NIGERIAN_STATES = Object.keys(statePositions);

export function NigeriaMap({ mode = 'members' }: NigeriaMapProps) {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const mapWidth = screenWidth - 32;
  const mapHeight = 620;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/analytics/map-data'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/map-data');
      return response.data;
    },
  });

  const getColorIntensity = (state: StateData): string => {
    if (!state) return '#E5E7EB';

    let value = 0;
    let max = 1;

    switch (mode) {
      case 'members':
        value = state.memberCount;
        max = Math.max(...(data?.states?.map((s: StateData) => s.memberCount) || [1]));
        break;
      case 'events':
        value = state.upcomingEvents;
        max = Math.max(...(data?.states?.map((s: StateData) => s.upcomingEvents) || [1]));
        break;
      case 'campaigns':
        value = state.activeCampaigns;
        max = Math.max(...(data?.states?.map((s: StateData) => s.activeCampaigns) || [1]));
        break;
      case 'activity':
        value = state.memberCount + state.upcomingEvents + state.activeCampaigns;
        max = Math.max(...(data?.states?.map((s: StateData) => 
          s.memberCount + s.upcomingEvents + s.activeCampaigns
        ) || [1]));
        break;
    }

    if (value === 0) return '#E5E7EB';
    
    const intensity = Math.min(value / max, 1);
    const greenValue = Math.floor(168 - (intensity * 50));
    const blueValue = Math.floor(107 - (intensity * 40));
    
    return `rgb(0, ${greenValue}, ${blueValue})`;
  };

  const getStateData = (stateName: string): StateData | undefined => {
    return data?.states?.find((s: StateData) => s.name === stateName);
  };

  const handleStatePress = (stateName: string) => {
    const stateData = getStateData(stateName);
    if (stateData) {
      setSelectedState(stateData);
    }
  };

  const getModeValue = (state: StateData): number => {
    switch (mode) {
      case 'members':
        return state.memberCount;
      case 'events':
        return state.upcomingEvents;
      case 'campaigns':
        return state.activeCampaigns;
      case 'activity':
        return state.memberCount + state.upcomingEvents + state.activeCampaigns;
      default:
        return 0;
    }
  };

  const getModeLabel = (): string => {
    switch (mode) {
      case 'members':
        return 'Members';
      case 'events':
        return 'Events';
      case 'campaigns':
        return 'Campaigns';
      case 'activity':
        return 'Total Activity';
      default:
        return 'Data';
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.loadingCard}>
        <Text variant="body" style={styles.loadingText}>Loading map data...</Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.mapContainer}
      >
        <Svg width={mapWidth} height={mapHeight} viewBox="0 0 380 620">
          <G>
            {NIGERIAN_STATES.map((stateName) => {
              const pos = statePositions[stateName];
              const stateData = getStateData(stateName);
              const fillColor = stateData ? getColorIntensity(stateData) : '#E5E7EB';
              const isSelected = selectedState?.name === stateName;

              return (
                <G key={stateName}>
                  <Pressable onPress={() => handleStatePress(stateName)}>
                    <Rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.width}
                      height={pos.height}
                      fill={fillColor}
                      stroke={isSelected ? '#00A86B' : '#9CA3AF'}
                      strokeWidth={isSelected ? 2 : 0.5}
                      opacity={isSelected ? 1 : 0.8}
                    />
                  </Pressable>
                  {pos.width >= 40 && pos.height >= 35 && (
                    <SvgText
                      x={pos.x + pos.width / 2}
                      y={pos.y + pos.height / 2}
                      fontSize={8}
                      fill="#000"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      opacity={0.7}
                    >
                      {stateName.length > 7 ? stateName.substring(0, 5) + '.' : stateName}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </G>
        </Svg>
      </ScrollView>

      {selectedState && (
        <Card style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text variant="h3" style={styles.stateName}>{selectedState.name} State</Text>
            <Pressable onPress={() => setSelectedState(null)} style={styles.closeButton}>
              <Text variant="body" style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statValue}>{selectedState.memberCount.toLocaleString()}</Text>
              <Text variant="caption" style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statValue}>{selectedState.upcomingEvents}</Text>
              <Text variant="caption" style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statValue}>{selectedState.activeCampaigns}</Text>
              <Text variant="caption" style={styles.statLabel}>Campaigns</Text>
            </View>
          </View>

          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text variant="caption" style={styles.infoLabel}>Active Members:</Text>
              <Text variant="body" style={styles.infoValue}>{selectedState.activeMembers.toLocaleString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="caption" style={styles.infoLabel}>LGAs Covered:</Text>
              <Text variant="body" style={styles.infoValue}>{selectedState.lgasCovered}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="caption" style={styles.infoLabel}>Wards Covered:</Text>
              <Text variant="body" style={styles.infoValue}>{selectedState.wardsCovered}</Text>
            </View>
          </View>
        </Card>
      )}

      {!selectedState && (
        <Card style={styles.legendCard}>
          <Text variant="body" style={styles.legendTitle}>
            {getModeLabel()} Distribution
          </Text>
          <Text variant="caption" style={styles.legendSubtitle}>
            Tap any state to view details
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    maxHeight: 620,
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
  },
  detailCard: {
    marginTop: 16,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stateName: {
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    color: '#00A86B',
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  additionalInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#6B7280',
  },
  infoValue: {
    color: '#111827',
    fontWeight: '600',
  },
  legendCard: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  legendSubtitle: {
    color: '#6B7280',
  },
});
