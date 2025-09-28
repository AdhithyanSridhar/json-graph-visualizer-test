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
        
        const mutableNodes = nodes.map(n => ({...n}));
        const mutableEdges = edges.map(e => ({...e}));


        mutableNodes.forEach((node: any) => {
            node.radius = Math.max(45 - (node.depth || 0) * 5, 15);
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
                .attr('refX', 10)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', style.color);
        });
        
        const simulation = d3.forceSimulation(mutableNodes)
            .force("link", d3.forceLink(mutableEdges).id((d: any) => d.id).distance(350).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-4000))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((d: any) => d.radius + 30));


        const link = g.append("g")
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(mutableEdges)
            .join("line")
            .attr("stroke", d => EDGE_STYLES[d.type]?.color || '#999')
            .attr("stroke-width", d => EDGE_STYLES[d.type]?.strokeWidth || 1.5)
            .attr("stroke-dasharray", d => EDGE_STYLES[d.type]?.dash)
            .attr('marker-end', d => `url(#arrow-${d.type})`);
        
        const edgeLabels = g.append("g")
            .selectAll(".edge-label")
            .data(mutableEdges.filter(d => d.label))
            .join("text")
            .attr("class", "edge-label")
            .attr("dy", -5)
            .text(d => d.label)
            .attr("font-size", "9px")
            .attr("fill", "#cbd5e1")
            .attr("text-anchor", "middle")
            .attr("paint-order", "stroke")
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round");
            
        const node = g.append("g")
            .selectAll("g")
            .data(mutableNodes)
            .join("g")
            .call(drag(simulation));
        
        // Highlighting logic
        const linkedByIndex: Record<string, boolean> = {};
        mutableEdges.forEach(d => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            linkedByIndex[`${sourceId},${targetId}`] = true;
        });

        function areNodesConnected(a: NodeType, b: NodeType) {
            return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
        }

        node.on('mouseover', (event: MouseEvent, d: any) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const content = d.data !== undefined ? JSON.stringify(d.data, null, 2) : d.label;
            setTooltip({
                visible: true,
                content,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });

            // Highlight connected nodes
            node.style('opacity', (o: any) => areNodesConnected(d, o) ? 1 : 0.2);
            link.style('opacity', (o: any) => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.2);
            edgeLabels.style('opacity', (o: any) => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.2);
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
            // Reset opacity
            node.style('opacity', 1);
            link.style('opacity', 1);
            edgeLabels.style('opacity', 1);
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

        const nodeText = node.append("text")
            .attr("fill", "#e0e7ff")
            .attr("font-size", "12px")
            .attr("text-anchor", "middle")
            .attr("paint-order", "stroke")
            .attr("stroke", "#1e1b4b")
            .attr("stroke-width", 3)
            .attr("stroke-linejoin", "round");
        
        nodeText.each(function(d: any) {
            wrapText(d3.select(this), d.label, d.radius * 2 * 0.8);
        });

        simulation.on("tick", () => {
            link.each(function(d: any) {
                const source = d.source as any;
                const target = d.target as any;
                
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist === 0) return;

                const targetRadius = target.radius || 0;
                const newTargetX = target.x - (dx / dist) * targetRadius;
                const newTargetY = target.y - (dy / dist) * targetRadius;

                d3.select(this)
                    .attr("x1", source.x)
                    .attr("y1", source.y)
                    .attr("x2", newTargetX)
                    .attr("y2", newTargetY);
            });

            edgeLabels.each(function(d: any) {
                const source = d.source as any;
                const target = d.target as any;
                
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;
                
                let angle = Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI);
                if (angle > 90 || angle < -90) {
                    angle += 180;
                }

                d3.select(this)
                    .attr("transform", `translate(${midX}, ${midY}) rotate(${angle})`);
            });

            node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
        });

        const zoom = d3.zoom().on("zoom", (event: any) => {
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

        function wrapText(selection: any, text: string, width: number) {
            selection.each(function() {
                const textElement = d3.select(this);
                const words = text.split(/\s+/).reverse();
                let word;
                let line: string[] = [];
                let lineNumber = 0;
                const lineHeight = 1.1; // ems
                const y = textElement.attr("y") || 0;
                const dy = 0;

                let tspan = textElement.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

                while ((word = words.pop())) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = textElement.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
                
                const tspans = textElement.selectAll('tspan');
                const numTspans = tspans.size();
                const verticalOffset = -((numTspans - 1) * lineHeight * 12 * 0.5) / 2;
                
                textElement.attr('transform', `translate(0, ${verticalOffset})`)

            });
        }

    }, [data, isMounted]);

    return (
        <div className="relative w-full h-full bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <svg ref={svgRef} className="w-full h-full"></svg>
            <Legend/>
            {tooltip.visible && (
                <div
                    className="absolute p-2 text-sm bg-gray-900/90 text-gray-200 border border-gray-600 rounded-md shadow-lg pointer-events-none max-w-sm max-h-80 overflow-auto backdrop-blur-sm transition-opacity"
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
