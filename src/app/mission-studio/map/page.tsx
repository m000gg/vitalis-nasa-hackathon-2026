import { MissionMapWorkbench } from "@/components/spacecraft/MissionMapWorkbench";
import { DashboardShell } from "@/components/DashboardShell";

export default function MissionStudioMapPage() {
  return <DashboardShell allowWithoutMission><MissionMapWorkbench embedded /></DashboardShell>;
}
