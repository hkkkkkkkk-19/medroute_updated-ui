
export interface Node {
  id: string;
  name: string;
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
}

export const dijkstra = (nodes: Node[], edges: Edge[], startNodeId: string, endNodeId: string) => {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const queue: string[] = [];

  nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    queue.push(node.id);
  });

  distances[startNodeId] = 0;

  while (queue.length > 0) {
    // Sort queue by distance
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift()!;

    if (u === endNodeId) break;

    const neighbors = edges.filter(e => e.from === u || e.to === u);
    neighbors.forEach(edge => {
      const v = edge.from === u ? edge.to : edge.from;
      if (queue.includes(v)) {
        const alt = distances[u] + edge.weight;
        if (alt < distances[v]) {
          distances[v] = alt;
          previous[v] = u;
        }
      }
    });
  }

  const path: string[] = [];
  let curr: string | null = endNodeId;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    path: path.length > 1 ? path : [],
    distance: distances[endNodeId]
  };
};

// Mock map data for MedRoute
export const medRouteMap = {
  nodes: [
    { id: 'DONOR_LOC', name: 'Donor Location', x: 10, y: 10 },
    { id: 'HUB_1', name: 'Srinagar Hub', x: 30, y: 40 },
    { id: 'HUB_2', name: 'Budgam Hub', x: 50, y: 20 },
    { id: 'WAREHOUSE', name: 'Central Warehouse', x: 70, y: 50 },
    { id: 'RECEIVER_LOC', name: 'Receiver Location', x: 90, y: 80 }
  ],
  edges: [
    { from: 'DONOR_LOC', to: 'HUB_1', weight: 12 },
    { from: 'DONOR_LOC', to: 'HUB_2', weight: 18 },
    { from: 'HUB_1', to: 'WAREHOUSE', weight: 25 },
    { from: 'HUB_2', to: 'WAREHOUSE', weight: 15 },
    { from: 'WAREHOUSE', to: 'RECEIVER_LOC', weight: 30 }
  ]
};
