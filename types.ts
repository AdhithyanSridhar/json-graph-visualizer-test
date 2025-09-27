// FIX: Import d3 types to resolve namespace errors for d3.SimulationNodeDatum and d3.SimulationLinkDatum.
import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string; // e.g., 'order', 'product', 'line', 'array', 'object'
  depth?: number;
  data?: any;
  status?: any; // To store status or milestone info
}

export interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'default' | 'sequence' | 'reference' | 'amendment';
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}
