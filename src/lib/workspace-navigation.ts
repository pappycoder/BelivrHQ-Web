/** Presentation groups only. Permission/plan filtering happens before grouping. */
export const workspaceAreas = [
  { id: "home", title: "Home", description: "Your church, at a glance", modules: ["Dashboard"] },
  { id: "people", title: "People", description: "Care for your community", modules: ["Members", "Visitors", "Pastoral Care", "Departments"] },
  { id: "gatherings", title: "Gatherings", description: "Bring your community together", modules: ["Events", "Services"] },
  { id: "giving", title: "Giving", description: "Steward every contribution", modules: ["Giving"] },
  { id: "communication", title: "Communication", description: "Keep the conversation going", modules: ["Inbox", "Messages", "Broadcasts", "Templates", "Appointments"] },
  { id: "resources", title: "Resources", description: "Everything your ministry needs", modules: ["Sermons", "Media", "Assets", "Forms"] },
  { id: "insights", title: "Insights", description: "Understand your church’s story", modules: ["Analytics", "Reports"] },
  { id: "administration", title: "Administration", description: "Make BelivrHQ work for you", modules: ["User Management", "Church Settings", "Integrations", "Branches"] },
] as const;

export interface WorkspaceDestination {
  title: string;
  href?: string;
  children?: WorkspaceDestination[];
}

export function destinationLeaves<T extends WorkspaceDestination>(items: T[]): T[] {
  return items.flatMap(item => item.children?.length ? destinationLeaves(item.children as T[]) : [item]);
}

export function groupWorkspaceNavigation<T extends WorkspaceDestination>(items: T[]) {
  return workspaceAreas.map(area => ({
    ...area,
    items: area.modules.flatMap(title => items.filter(item => item.title === title)),
  })).filter(area => area.items.length > 0);
}

export function activeDestination<T extends WorkspaceDestination>(items: T[], pathname: string): T | undefined {
  // Include module roots as well as leaves: detail routes may have no readable list.
  const all = items.flatMap(item => [item, ...(item.children ? flattenDestinations(item.children as T[]) : [])]);
  return all.filter(item => item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href!.length - a.href!.length)[0];
}

function flattenDestinations<T extends WorkspaceDestination>(items: T[]): T[] {
  return items.flatMap(item => [item, ...(item.children ? flattenDestinations(item.children as T[]) : [])]);
}

export function areaForPath<A extends { id: string; items: WorkspaceDestination[] }>(areas: A[], pathname: string): A | undefined {
  return areas.find(area => activeDestination(area.items, pathname));
}
