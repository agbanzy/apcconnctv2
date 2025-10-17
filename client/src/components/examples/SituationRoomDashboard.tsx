import { SituationRoomDashboard } from "../situation-room-dashboard";

export default function SituationRoomDashboardExample() {
  return (
    <div className="p-4 max-w-4xl">
      <SituationRoomDashboard
        totalUnits={250}
        pollingUnits={[
          {
            id: "PU-001",
            name: "Polling Unit 001 - Central School",
            status: "completed",
            votes: 342,
            timestamp: "10:45 AM",
          },
          {
            id: "PU-002",
            name: "Polling Unit 002 - Community Hall",
            status: "active",
            votes: 0,
            timestamp: "11:30 AM",
          },
          {
            id: "PU-003",
            name: "Polling Unit 003 - Market Square",
            status: "incident",
            votes: 0,
            timestamp: "11:15 AM",
          },
          {
            id: "PU-004",
            name: "Polling Unit 004 - Primary School",
            status: "delayed",
            votes: 0,
            timestamp: "09:30 AM",
          },
          {
            id: "PU-005",
            name: "Polling Unit 005 - Town Hall",
            status: "completed",
            votes: 428,
            timestamp: "11:00 AM",
          },
        ]}
      />
    </div>
  );
}
