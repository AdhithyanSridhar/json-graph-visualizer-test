import React, { useEffect, useRef, useState } from 'react';
import { GraphData, Node as NodeType, Edge as EdgeType } from '../types';

interface GraphViewerProps {
    data: GraphData | null;
}

const NODE_COLORS: Record<string, string> = {
    order: '#a78bfa',      // Violet-400
    product: '#f472b6',    // Pink-400
    line: '#60a5fa',       // Blue-400
    item: '#34d399',       // Emerald-400
    service: '#2dd4bf',    // Teal-400
    fulfillment: '#fb923c',// Orange-400
    shipment: '#fbbf24',   // Amber-400
    address: '#fde047',    // Yellow-300
    account: '#4ade80',    // Green-400
    customer: '#38bdf8',   // Light Blue-400
    promotion: '#a3e635',  // Lime-400
    eventLog: '#9ca3af',   // Gray-400
    status: '#e5e7eb',     // Gray-200
    array: '#6b7280',      // Gray-500
    object: '#a1a1aa',     // Zinc-400
    default: '#d4d4d8'     // Zinc-300
};

const STATUS_BORDER_COLORS: Record<string, string> = {
    // Milestones
    started: '#fde047',
    shipped: '#38bdf8',
    delivered: '#4ade80',
    completed: '#86efac',
    activated: '#a78bfa',
    // Statuses
    Active: '#22c55e',
    Processing: '#f59e0b',
    Pending: '#eab308',
    Cancelled: '#ef4444',
    default: '#a5b4fc'
};

const EDGE_STYLES: Record<string, { color: string; strokeWidth: number; dash?: string }> = {
    default: { color: '#6b7280', strokeWidth: 1.5 },
    sequence: { color: '#34d399', strokeWidth: 2 },
    reference: { color: '#60a5fa', strokeWidth: 2, dash: '5,5' },
    amendment: { color: '#f87171', strokeWidth: 2.5, dash: '8,4' }
};

const Legend: React.FC = () => (
    <div className="absolute top-2 left-2 bg-gray-900/70 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 backdrop-blur-sm max-w-xs">
        <h4 className="font-bold mb-2">Node Types</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(NODE_COLORS).filter(([key]) => !['default', 'object', 'array', 'status'].includes(key)).map(([type, color]) => (
                <div key={type} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                    <span className="capitalize">{type}</span>
                </div>
            ))}
        </div>
        <h4 className="font-bold mt-3 mb-2">Edge Types</h4>
        <div className="space-y-1">
            {Object.entries(EDGE_STYLES).map(([type, style]) => (
                 <div key={type} className="flex items-center">
                    <svg width="20" height="10" className="mr-2">
                        <line x1="0" y1="5" x2="20" y2="5" style={{ stroke: style.color, strokeWidth: style.strokeWidth, strokeDasharray: style.dash }}/>
                    </svg>
                    <span className="capitalize">{type}</span>
                </div>
            ))}
        </div>
    </div>
);


const GraphViewer: React.FC<GraphViewerProps> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        content: string;
        x: number;
        y: number;
    }>({ visible: false, content: '', x: 0, y: 0 });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!data || !svgRef.current || !isMounted) return;

        const d3 = (window as any).d3;
        if (!d3) {
            console.error("D3.js not loaded");
            return;
        }

        const { nodes, edges } = data;

        // Add radius to nodes based on depth for sizing
        nodes.forEach((node: any) => {
            node.radius = Math.max(22 - (node.depth || 0) * 3, 8);
        });

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 

        const width = svg.node()?.getBoundingClientRect().width || 800;
        const height = svg.node()?.getBoundingClientRect().height || 600;

        const g = svg.append("g");

        const defs = g.append('defs');
        Object.entries(EDGE_STYLES).forEach(([type, style]) => {
            defs.append('marker')
                .attr('id', `arrow-${type}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 32) // Adjusted for larger nodes
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', style.color);
        });
        
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id((d: any) => d.id).distance((d: any) => (d.source.radius || 8) + (d.target.radius || 8) + 80).strength(0.4))
            .force("charge", d3.forceManyBody().strength(-600))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX().strength(0.1))
            .force("y", d3.forceY().strength(0.1));

        const link = g.append("g")
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(edges)
            .join("line")
            .attr("stroke", d => EDGE_STYLES[d.type]?.color || '#999')
            .attr("stroke-width", d => EDGE_STYLES[d.type]?.strokeWidth || 1.5)
            .attr("stroke-dasharray", d => EDGE_STYLES[d.type]?.dash)
            .attr('marker-end', d => `url(#arrow-${d.type})`);
            
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation))
            .on('mouseover', (event: MouseEvent, d: any) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                const content = d.data !== undefined ? JSON.stringify(d.data, null, 2) : d.label;
                setTooltip({
                    visible: true,
                    content,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                });
            })
            .on('mousemove', (event: MouseEvent) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                setTooltip(prev => ({
                    ...prev,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                }));
            })
            .on('mouseout', () => {
                setTooltip(prev => ({ ...prev, visible: false }));
            });

        const getNodeStatusColor = (d: NodeType) => {
            if (!d.data || !d.data.status) return 'none';
            return STATUS_BORDER_COLORS[d.data.status.code] || 'none';
        };

        node.append("circle")
            .attr("r", (d: any) => d.radius)
            .attr("fill", (d: any) => NODE_COLORS[d.type] || NODE_COLORS.default)
            .attr("stroke", (d: any) => getNodeStatusColor(d))
            .attr("stroke-width", 3);

        node.append("text")
            .attr("x", (d: any) => d.radius + 6)
            .attr("y", "0.31em")
            .text((d: any) => d.label)
            .attr("fill", "#e0e7ff")
            .attr("font-size", "14px")
            .attr("paint-order", "stroke")
            .attr("stroke", "#1e1b4b")
            .attr("stroke-width", 3)
            .attr("stroke-linejoin", "round");


        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as any).x)
                .attr("y1", d => (d.source as any).y)
                .attr("x2", d => (d.target as any).x)
                .attr("y2", d => (d.target as any).y);

            node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
        });

        const zoom = d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
        svg.call(zoom);

        function drag(simulation: any) {
            function dragstarted(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event: any, d: any) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

    }, [data, isMounted]);

    return (
        <div className="relative w-full h-full bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <svg ref={svgRef} className="w-full h-full"></svg>
            <Legend/>
            {tooltip.visible && (
                <div
                    className="absolute p-2 text-sm bg-gray-900/90 text-gray-200 border border-gray-600 rounded-md shadow-lg pointer-events-none max-w-sm max-h-80 overflow-auto backdrop-blur-sm"
                    style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
                    role="tooltip"
                >
                    <pre className="font-mono whitespace-pre-wrap">{tooltip.content}</pre>
                </div>
            )}
        </div>
    );
};

export default GraphViewer;