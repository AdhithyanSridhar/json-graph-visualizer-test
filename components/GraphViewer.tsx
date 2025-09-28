import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { GraphData, Node as NodeType, Edge as EdgeType } from '../types';

type Theme = 'light' | 'dark';

interface GraphViewerProps {
    data: GraphData | null;
    theme: Theme;
}

export interface GraphViewerRef {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    exportAsPNG: () => void;
}

// --- THEME PALETTES ---
const themes = {
    dark: {
        bg: '#1f2937', // gray-800
        text: '#d1d5db', // gray-300
        textTooltip: '#e5e7eb', // gray-200
        bgTooltip: 'rgba(17, 24, 39, 0.9)', // gray-900/90
        borderTooltip: '#4b5563', // gray-600
        edgeLabelFill: '#cbd5e1', // slate-300
        edgeLabelStroke: '#1e293b', // slate-800
        nodeText: '#e0e7ff', // indigo-100
        nodeStroke: '#1e1b4b', // indigo-900
    },
    light: {
        bg: '#f9fafb', // gray-50
        text: '#374151', // gray-700
        textTooltip: '#1f2937', // gray-800
        bgTooltip: 'rgba(255, 255, 255, 0.95)',
        borderTooltip: '#d1d5db', // gray-300
        edgeLabelFill: '#334155', // slate-700
        edgeLabelStroke: '#ffffff',
        nodeText: '#1e293b', // slate-800
        nodeStroke: '#ffffff',
    }
};

const NODE_COLORS: Record<string, string> = {
    default: '#64748b',
    object: '#78716c',
    array: '#78716c',
    order: '#7c3aed',
    customer: '#2563eb',
    product: '#db2777',
    line: '#ea580c',
    service: '#f59e0b',
    item: '#16a34a',
    fulfillment: '#0891b2',
    shipment: '#0ea5e9',
    promotion: '#8b5cf6',
    address: '#d946ef',
    account: '#10b981',
    eventLog: '#64748b',
    status: '#475569',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
    active: '#22c55e',
    shipped: '#3b82f6',
    in_progress: '#eab308',
    in_transit: '#a855f7',
    default: 'transparent'
};

const getEdgeStyles = (theme: Theme): Record<string, { color: string; strokeWidth: number; dash?: string }> => ({
    default: { color: theme === 'dark' ? '#6b7280' : '#9ca3af', strokeWidth: 1.5 },
    sequence: { color: '#34d399', strokeWidth: 2, dash: 'none' },
    reference: { color: '#60a5fa', strokeWidth: 2, dash: '5,5' },
    amendment: { color: '#f87171', strokeWidth: 2.5, dash: '8,4' }
});

const Legend: React.FC<{ theme: Theme }> = ({ theme }) => (
    <div className="absolute top-2 left-2 p-3 rounded-lg border text-xs backdrop-blur-sm max-w-xs transition-colors" style={{ backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)', borderColor: theme === 'dark' ? '#374151' : '#d1d5db', color: themes[theme].text }}>
        <h4 className="font-bold mb-2">Node Types</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(NODE_COLORS).filter(([key]) => !['default', 'object', 'array', 'status'].includes(key)).map(([type, color]) => (
                <div key={type} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                    <span className="capitalize">{type}</span>
                </div>
            ))}
        </div>
    </div>
);


const GraphViewer = forwardRef<GraphViewerRef, GraphViewerProps>(({ data, theme }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number; }>({ visible: false, content: '', x: 0, y: 0 });
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const simulationRef = useRef<d3.Simulation<NodeType, EdgeType> | null>(null);

    useImperativeHandle(ref, () => ({
        zoomIn() {
            const svg = d3.select(svgRef.current);
            if (zoomRef.current) {
                svg.transition().duration(750).call(zoomRef.current.scaleBy, 1.2);
            }
        },
        zoomOut() {
            const svg = d3.select(svgRef.current);
            if (zoomRef.current) {
                svg.transition().duration(750).call(zoomRef.current.scaleBy, 0.8);
            }
        },
        reset() {
            fitAndCenter(750);
        },
        exportAsPNG() {
            const svgElement = svgRef.current;
            if (!svgElement) return;

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const { width, height } = svgElement.getBoundingClientRect();
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.fillStyle = themes[theme].bg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                const a = document.createElement('a');
                a.download = 'graph.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
            };
            img.src = url;
        }
    }));

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const fitAndCenter = (duration = 0) => {
        const svg = d3.select(svgRef.current);
        const g = svg.select('g.main-group');
        if (g.empty()) return;

        const zoom = zoomRef.current;
        if (!zoom) return;

        const nodes = (simulationRef.current?.nodes() as (NodeType & {x:number, y:number, radius: number})[]) || [];
        if (nodes.length === 0) return;

        const svgNode = svg.node();
        if(!svgNode) return;
        
        const { width, height } = svgNode.getBoundingClientRect();
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(d => {
            const radius = (d as any).radius || 30;
            if (d.x - radius < minX) minX = d.x - radius;
            if (d.x + radius > maxX) maxX = d.x + radius;
            if (d.y - radius < minY) minY = d.y - radius;
            if (d.y + radius > maxY) maxY = d.y - radius;
        });

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        
        if (graphWidth <= 0 || graphHeight <= 0) return;

        const padding = 80;
        const scale = Math.min((width - padding) / graphWidth, (height - padding) / graphHeight, 1.5);
        const translateX = (width / 2) - (scale * (minX + maxX) / 2);
        const translateY = (height / 2) - (scale * (minY + maxY) / 2);

        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        const transition = duration > 0 ? svg.transition().duration(duration) : svg;
        transition.call(zoom.transform, transform);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                const svg = d3.select(svgRef.current);
                const svgNode = svg.node();
                if(!svgNode) return;
                const { width, height } = svgNode.getBoundingClientRect();
                
                // Update the center for the radial force
                simulationRef.current?.force("r", d3.forceRadial((d: any) => (d.depth || 0) * 220, width / 2, height / 2).strength(0.9));
                
                simulationRef.current?.alpha(0.3).restart();
            });
        });
        
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();

    }, [data]);

    useEffect(() => {
        if (!data || !svgRef.current || !isMounted) return;
        
        const EDGE_STYLES = getEdgeStyles(theme);
        const currentTheme = themes[theme];

        const drag = (simulation: d3.Simulation<NodeType, any>) => {
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
            return d3.drag<any, NodeType>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        };
        
        const wrapText = (selection: d3.Selection<d3.BaseType, NodeType, SVGGElement, unknown>, maxWidth: number) => {
            selection.each(function(d) {
                const text = d3.select(this);
                const words = d.label.split(/\s+/).reverse();
                let word;
                let line: string[] = [];
                let lineNumber = 0;
                const lineHeight = 1.1; // ems
                const y = text.attr("y") || 0;
                const dy = parseFloat(text.attr("dy") || "0");
                text.text(null);

                let tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && line.length > 1) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word);
                    }
                }
            });
        };
        
        const { nodes, edges } = data;
        
        const mutableNodes: (NodeType & { radius?: number })[] = nodes.map(n => ({...n}));
        const mutableEdges = edges.map(e => ({...e}));

        mutableNodes.forEach((node) => {
            node.radius = Math.max(45 - (node.depth || 0) * 5, 15);
        });

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 

        const svgNode = svg.node();
        if (!svgNode) return;
        const { width, height } = svgNode.getBoundingClientRect();

        const g = svg.append("g").attr('class', 'main-group');
        
        const pulseAnimation = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
            .order-node-pulse { animation: pulse 2.5s infinite ease-in-out; }
        `;

        const defs = g.append('defs');
        defs.append('style').text(pulseAnimation);

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
        
        const simulation = d3.forceSimulation<NodeType, EdgeType>(mutableNodes)
            .force("link", d3.forceLink<NodeType, EdgeType>(mutableEdges)
                .id(d => d.id)
                .strength(0.8)
                .distance(60)
            )
            .force("charge", d3.forceManyBody().strength(-800))
            .force("collision", d3.forceCollide().radius((d: any) => d.radius + 20))
            .force("r", d3.forceRadial((d: any) => (d.depth || 0) * 220, width / 2, height / 2).strength(0.9));
        
        simulationRef.current = simulation;

        const link = g.append("g")
            .attr("class", "links")
            .selectAll("path")
            .data(mutableEdges)
            .join("path")
            .attr("stroke", d => EDGE_STYLES[d.type]?.color || '#999')
            .attr("stroke-width", d => EDGE_STYLES[d.type]?.strokeWidth || 1.5)
            .attr("stroke-dasharray", d => EDGE_STYLES[d.type]?.dash || 'none')
            .attr("fill", "none")
            .attr('marker-end', d => `url(#arrow-${d.type})`);
        
        const edgeLabels = g.append("g")
            .attr("class", "edge-labels")
            .selectAll("text")
            .data(mutableEdges.filter(d => d.label))
            .join("text")
            .attr("dy", -3)
            .append("textPath")
                .attr("xlink:href", (d, i) => `#edgepath-${i}`)
                .style("text-anchor", "middle")
                .attr("startOffset", "50%")
                .text(d => d.label!)
                .attr("font-size", "10px")
                .attr("fill", currentTheme.edgeLabelFill)
                .attr("paint-order", "stroke")
                .attr("stroke", currentTheme.edgeLabelStroke)
                .attr("stroke-width", 3);
            
        const node = g.append("g")
            .attr("class", "node-group")
            .selectAll("g")
            .data(mutableNodes)
            .join("g")
            .attr('class', d => d.type === 'order' ? 'order-node-pulse' : null)
            .call(drag(simulation as d3.Simulation<NodeType, any>));
        
        const nodeEnter = node.on('mouseover', function(event, d) {
            setTooltip({ visible: true, content: JSON.stringify(d.data, null, 2), x: event.pageX, y: event.pageY });
            
            // Highlight logic
            const connectedEdges = new Set<string>();
            const connectedNodes = new Set<string>([d.id]);

            link.each(function(e) {
                const sourceId = (e.source as NodeType).id;
                const targetId = (e.target as NodeType).id;
                if(sourceId === d.id || targetId === d.id) {
                    connectedEdges.add((this as SVGPathElement).id);
                    connectedNodes.add(sourceId);
                    connectedNodes.add(targetId);
                }
            });

            node.transition().duration(200).style('opacity', n => connectedNodes.has(n.id) ? 1.0 : 0.2);
            link.transition().duration(200).style('opacity', e => connectedEdges.has((e as any).id) ? 1.0 : 0.1);
            edgeLabels.transition().duration(200).style('opacity', e => connectedEdges.has((e as any).id) ? 1.0 : 0.1);

        }).on('mousemove', function(event, d) {
            setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
        }).on('mouseout', function(event, d) {
            setTooltip({ visible: false, content: '', x: 0, y: 0 });
            
            // Restore opacity
            node.transition().duration(200).style('opacity', 1.0);
            link.transition().duration(200).style('opacity', 1.0);
            edgeLabels.transition().duration(200).style('opacity', 1.0);
        });
        
        const getNodeStatusColor = (d: NodeType) => {
            const status = d.status?.code?.toLowerCase() || d.status?.status?.toLowerCase() || d.data?.code?.toLowerCase() || d.data?.status?.toLowerCase() || '';
            if (status.includes('active')) return STATUS_BORDER_COLORS.active;
            if (status.includes('shipped')) return STATUS_BORDER_COLORS.shipped;
            if (status.includes('progress')) return STATUS_BORDER_COLORS.in_progress;
            if (status.includes('transit')) return STATUS_BORDER_COLORS.in_transit;
            return STATUS_BORDER_COLORS.default;
        };

        node.append("circle")
            .attr("r", (d: any) => d.radius)
            .attr("fill", d => NODE_COLORS[d.type] || NODE_COLORS.default)
            .attr("stroke", d => getNodeStatusColor(d))
            .attr("stroke-width", d => getNodeStatusColor(d) === 'transparent' ? 0 : 4);

        const nodeText = node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .attr("font-size", d => `${Math.max(10, 14 - (d.depth || 0))}px`)
            .attr("fill", currentTheme.nodeText)
            .attr("paint-order", "stroke")
            .attr("stroke", currentTheme.nodeStroke)
            .attr("stroke-width", 2)
            .style("pointer-events", "none");

        nodeText.each(function(d) {
            wrapText(d3.select(this) as d3.Selection<d3.BaseType, NodeType, SVGGElement, unknown>, (d as any).radius * 2 * 0.8);
        });

        simulation.on("tick", () => {
             link.attr("d", d => {
                const source = d.source as any;
                const target = d.target as any;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) return null;

                const targetRadius = target.radius || 30;
                const markerOffset = 8;
                const effectiveTargetRadius = targetRadius + markerOffset;

                const targetX = target.x - (dx / dist) * effectiveTargetRadius;
                const targetY = target.y - (dy / dist) * effectiveTargetRadius;

                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
             });
            
            link.attr('id', (d, i) => `edgepath-${i}`);

            node.attr("transform", (d: any) => `translate(${d.x || 0},${d.y || 0})`);
        });

        const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event: any) => g.attr("transform", event.transform));
        simulation.on("end", () => fitAndCenter(750));
        svg.call(zoom);
        zoomRef.current = zoom; 

    }, [data, isMounted, theme]);

    const currentTheme = themes[theme];
    const tooltipRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (tooltip.visible && tooltipRef.current && containerRef.current) {
            const tooltipEl = tooltipRef.current;
            const containerEl = containerRef.current;
            const containerRect = containerEl.getBoundingClientRect();
            const tooltipRect = tooltipEl.getBoundingClientRect();
            
            let left = tooltip.x + 20;
            let top = tooltip.y + 20;

            if (left + tooltipRect.width > containerRect.right) {
                left = tooltip.x - tooltipRect.width - 20;
            }
            if (top + tooltipRect.height > containerRect.bottom) {
                top = tooltip.y - tooltipRect.height - 20;
            }
            if (left < containerRect.left) {
              left = containerRect.left + 5;
            }
            if (top < containerRect.top) {
              top = containerRect.top + 5;
            }

            tooltipEl.style.transform = `translate(${left}px, ${top}px)`;
        }
    }, [tooltip]);

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-lg border overflow-hidden transition-colors" style={{ backgroundColor: currentTheme.bg, borderColor: theme === 'dark' ? '#374151' : '#d1d5db' }}>
            <svg ref={svgRef} className="w-full h-full"></svg>
            <Legend theme={theme}/>
            {tooltip.visible && (
                 <div
                    ref={tooltipRef}
                    className="fixed top-0 left-0 p-3 rounded-lg border shadow-lg max-w-sm text-xs backdrop-blur-sm transition-opacity pointer-events-none"
                    style={{
                        backgroundColor: currentTheme.bgTooltip,
                        borderColor: currentTheme.borderTooltip,
                        color: currentTheme.textTooltip,
                        opacity: 1,
                    }}
                >
                    <pre className="font-mono whitespace-pre-wrap">{tooltip.content}</pre>
                </div>
            )}
        </div>
    );
});

export default GraphViewer;
