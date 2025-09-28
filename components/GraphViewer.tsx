import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
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
        bgLegend: 'rgba(17, 24, 39, 0.7)', // gray-900/70
        borderLegend: '#374151', // gray-700
        text: '#d1d5db', // gray-300
        textTooltip: '#e5e7eb', // gray-200
        bgTooltip: 'rgba(17, 24, 39, 0.9)', // gray-900/90
        borderTooltip: '#4b5563', // gray-600
        edgeLabelFill: '#cbd5e1', // slate-300
        edgeLabelStroke: '#1e293b', // slate-800
        nodeText: '#e0e7ff', // indigo-100
        nodeStroke: '#1e1b4b', // indigo-900
        emptyStateText: '#9ca3af', // gray-400
        emptyStateIcon: '#4b5563', // gray-600
        emptyStateBorder: '#374151', // gray-700
    },
    light: {
        bg: '#f9fafb', // gray-50
        bgLegend: 'rgba(255, 255, 255, 0.7)',
        borderLegend: '#d1d5db', // gray-300
        text: '#374151', // gray-700
        textTooltip: '#1f2937', // gray-800
        bgTooltip: 'rgba(255, 255, 255, 0.95)',
        borderTooltip: '#d1d5db', // gray-300
        edgeLabelFill: '#334155', // slate-700
        edgeLabelStroke: '#ffffff',
        nodeText: '#1e293b', // slate-800
        nodeStroke: '#ffffff',
        emptyStateText: '#6b7280', // gray-500
        emptyStateIcon: '#9ca3af', // gray-400
        emptyStateBorder: '#d1d5db', // gray-300
    }
};

const NODE_COLORS: Record<string, string> = {
    default: '#64748b', // slate-500
    object: '#78716c', // stone-500
    array: '#78716c', // stone-500
    order: '#7c3aed', // violet-600
    customer: '#2563eb', // blue-600
    product: '#db2777', // pink-600
    line: '#ea580c', // orange-600
    service: '#f59e0b', // amber-500
    item: '#16a34a', // green-600
    fulfillment: '#0891b2', // cyan-600
    shipment: '#0ea5e9', // sky-500
    promotion: '#8b5cf6', // violet-500
    address: '#d946ef', // fuchsia-500
    account: '#10b981', // emerald-500
    eventLog: '#64748b', // slate-500
    status: '#eab308', // yellow-500
};

const STATUS_BORDER_COLORS: Record<string, string> = {
    active: '#22c55e', // green-500
    shipped: '#3b82f6', // blue-500
    in_progress: '#f59e0b', // amber-500
    in_transit: '#a855f7', // purple-500
    default: 'transparent'
};

const getEdgeStyles = (theme: Theme): Record<string, { color: string; strokeWidth: number; dash?: string }> => ({
    default: { color: theme === 'dark' ? '#6b7280' : '#9ca3af', strokeWidth: 1.5 },
    sequence: { color: '#34d399', strokeWidth: 2 },
    reference: { color: '#60a5fa', strokeWidth: 2, dash: '5,5' },
    amendment: { color: '#f87171', strokeWidth: 2.5, dash: '8,4' }
});


const Legend: React.FC<{ theme: Theme }> = ({ theme }) => (
    <div className="absolute top-2 left-2 p-3 rounded-lg border text-xs backdrop-blur-sm max-w-xs transition-colors" style={{ backgroundColor: themes[theme].bgLegend, borderColor: themes[theme].borderLegend, color: themes[theme].text }}>
        <h4 className="font-bold mb-2">Node Types</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(NODE_COLORS).filter(([key]) => !['default', 'object', 'array'].includes(key)).map(([type, color]) => (
                <div key={type} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                    <span className="capitalize">{type}</span>
                </div>
            ))}
        </div>
        <h4 className="font-bold mt-3 mb-2">Edge Types</h4>
        <div className="space-y-1">
            {Object.entries(getEdgeStyles(theme)).map(([type, style]) => (
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


const GraphViewer = forwardRef<GraphViewerRef, GraphViewerProps>(({ data, theme }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number; }>({ visible: false, content: '', x: 0, y: 0 });
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const simulationRef = useRef<d3.Simulation<NodeType, EdgeType>>();

    const fitToView = useCallback(() => {
        const svg = d3.select(svgRef.current);
        const g = svg.select<SVGGElement>('g.main-group');
        const zoom = zoomRef.current;
        if (!svg.node() || g.empty() || !zoom) return;

        const nodes = g.selectAll<SVGGElement, NodeType>('g.node-group > g').data() as (NodeType & { radius?: number, x:number, y:number })[];
        if (nodes.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            const radius = node.radius || 0;
            if (node.x - radius < minX) minX = node.x - radius;
            if (node.x + radius > maxX) maxX = node.x + radius;
            if (node.y - radius < minY) minY = node.y - radius;
            if (node.y + radius > maxY) maxY = node.y + radius;
        });

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        const svgNode = svg.node();
        if (!svgNode) return;

        const { width, height } = svgNode.getBoundingClientRect();

        if (graphWidth === 0 || graphHeight === 0) return;

        const padding = 80;
        const scale = Math.min((width - padding) / graphWidth, (height - padding) / graphHeight, 1.5);

        const translateX = (width / 2) - (scale * (minX + maxX) / 2);
        const translateY = (height / 2) - (scale * (minY + maxY) / 2);
        
        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        svg.transition().duration(750).call(zoom.transform, transform);
    }, []);
    
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
            fitToView();
        },
        exportAsPNG() {
            const svgElement = svgRef.current;
            if (!svgElement) return;
    
            const { width, height } = svgElement.getBoundingClientRect();
    
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
    
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width * 2; // for higher resolution
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
    
                ctx.fillStyle = themes[theme].bg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.scale(2,2);
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
    
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = 'graph.png';
                link.href = pngUrl;
                link.click();
            };
            img.src = url;
        }
    }));

    useEffect(() => {
        setIsMounted(true);
        
        // FIX: The ResizeObserver callback expects arguments. While JavaScript often allows omitting them,
        // some TypeScript configurations can be strict. The error "Expected 1 arguments, but got 0" can
        // be misleadingly reported on a different line when dealing with callback signature mismatches.
        // Adding the `entries` parameter to satisfy the expected signature.
        const resizeObserver = new ResizeObserver((entries) => {
            window.requestAnimationFrame(() => {
                const svg = d3.select(svgRef.current);
                const simulation = simulationRef.current;
                if (svg.node() && simulation) {
                    const { width, height } = svg.node()!.getBoundingClientRect();
                    simulation.force('x', d3.forceX(width / 2).strength(0.1));
                    simulation.force('y', d3.forceY(height / 2).strength(0.1));
                    simulation.alpha(0.3).restart();
                }
            });
        });

        if (svgRef.current) {
            resizeObserver.observe(svgRef.current);
        }

        return () => {
            if (svgRef.current) {
                resizeObserver.unobserve(svgRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!data || !svgRef.current || !isMounted) return;
        
        const EDGE_STYLES = getEdgeStyles(theme);
        const currentTheme = themes[theme];
        
        const { nodes, edges } = data;
        
        const mutableNodes: (NodeType & { radius?: number })[] = nodes.map(n => ({...n}));
        const mutableEdges: EdgeType[] = edges.map(e => ({...e}));

        mutableNodes.forEach((node) => {
            node.radius = Math.max(45 - (node.depth || 0) * 5, 15);
        });

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 

        const { width, height } = svg.node()!.getBoundingClientRect();

        const g = svg.append("g").attr('class', 'main-group');

        const defs = g.append('defs');
        Object.entries(EDGE_STYLES).forEach(([type, style]) => {
            defs.append('marker')
                .attr('id', `arrow-${type}-${theme}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 10)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto-start-reverse')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', style.color);
        });
        
        const simulation = d3.forceSimulation(mutableNodes)
            .force("link", d3.forceLink<NodeType, EdgeType>(mutableEdges).id(d => d.id).distance(250).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-2000))
            .force("collision", d3.forceCollide().radius(d => (d as any).radius + 40))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1));
        
        simulationRef.current = simulation;

        const link = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.8)
            .selectAll("path")
            .data(mutableEdges)
            .join("path")
            .attr("stroke", d => EDGE_STYLES[d.type]?.color || '#999')
            .attr("stroke-width", d => EDGE_STYLES[d.type]?.strokeWidth || 1.5)
            .attr("stroke-dasharray", d => EDGE_STYLES[d.type]?.dash)
            .attr('marker-end', d => `url(#arrow-${d.type}-${theme})`)
            .attr('id', (d, i) => `edgepath${i}`);
        
        const edgeLabels = g.append("g")
            .attr("class", "edge-labels")
            .selectAll(".edge-label")
            .data(mutableEdges.filter(d => d.label))
            .join("text")
            .attr("class", "edge-label")
            .attr("dy", -5)
            .attr("font-size", "9px")
            .attr("fill", currentTheme.edgeLabelFill)
            .attr("text-anchor", "middle")
            .attr("paint-order", "stroke")
            .attr("stroke", currentTheme.edgeLabelStroke)
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round")
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", (d, i) => `#edgepath${i}`)
            .text(d => d.label!);
            
        const drag = (simulation: d3.Simulation<NodeType, EdgeType>) => {
            function dragstarted(event: any, d: NodeType) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event: any, d: NodeType) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event: any, d: NodeType) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag<SVGGElement, NodeType>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        };

        const node = g.append("g")
            .attr("class", "node-group")
            .selectAll("g")
            .data(mutableNodes)
            .join("g")
            .call(drag(simulation));

        const linkedByIndex = new Map();
        mutableEdges.forEach(d => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            linkedByIndex.set(`${sourceId},${targetId}`, 1);
        });
        
        const isConnected = (a: NodeType, b: NodeType) => linkedByIndex.has(`${a.id},${b.id}`) || linkedByIndex.has(`${b.id},${a.id}`) || a.id === b.id;

        node.on('mouseover', function (event: MouseEvent, d: NodeType) {
            node.style('opacity', o => isConnected(d, o) ? 1 : 0.2);
            link.style('opacity', o => (o.source as NodeType).id === d.id || (o.target as NodeType).id === d.id ? 1 : 0.2);
            edgeLabels.selectAll('textPath').style('opacity', o => ((o as EdgeType).source as NodeType).id === d.id || ((o as EdgeType).target as NodeType).id === d.id ? 1 : 0.2);
            
            const content = JSON.stringify(d.data, null, 2);
            setTooltip({ visible: true, content, x: event.pageX + 15, y: event.pageY + 15 });
        });
    
        node.on('mousemove', function (event: MouseEvent) {
            setTooltip(prev => ({ ...prev, x: event.pageX + 15, y: event.pageY + 15 }));
        });
    
        node.on('mouseout', function () {
            node.style('opacity', 1);
            link.style('opacity', 1);
            edgeLabels.selectAll('textPath').style('opacity', 1);
            setTooltip({ visible: false, content: '', x: 0, y: 0 });
        });

        const getNodeStatusColor = (d: NodeType) => {
            if (d.type === 'status' && d.data) {
                const statusText = (d.data.milestone || d.data.code || d.data.status || '').toLowerCase();
                if (statusText.includes('active')) return STATUS_BORDER_COLORS.active;
                if (statusText.includes('shipped')) return STATUS_BORDER_COLORS.shipped;
                if (statusText.includes('progress')) return STATUS_BORDER_COLORS.in_progress;
                if (statusText.includes('transit')) return STATUS_BORDER_COLORS.in_transit;
            }
            return STATUS_BORDER_COLORS.default;
        };

        node.append("circle")
            .attr("r", d => (d as any).radius)
            .attr("fill", d => NODE_COLORS[d.type] || NODE_COLORS.default)
            .attr("stroke", d => getNodeStatusColor(d))
            .attr("stroke-width", 3);

        const wrapText = (selection: d3.Selection<SVGTextElement, unknown, null, undefined>, text: string, width: number) => {
            selection.each(function () {
                const textElement = d3.select(this);
                const words = text.split(/\s+/).reverse();
                let word;
                let line: string[] = [];
                let lineNumber = 0;
                const lineHeight = 1.1; // ems
                const y = textElement.attr("y") || 0;
                const dy = parseFloat(textElement.attr("dy") || "0");
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
                if (numTspans > 1) {
                    const totalHeight = (numTspans - 1) * lineHeight;
                    tspans.each(function(d, i){
                        d3.select(this).attr('y', - (totalHeight / 2) * 10 + (i * lineHeight * 10)); // Using pixels for offset
                    });
                }
            });
        };

        const nodeText = node.append("text")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", currentTheme.nodeText)
            .attr("paint-order", "stroke")
            .attr("stroke", currentTheme.nodeStroke)
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round");
            
        nodeText.each(function(d) {
            wrapText(d3.select(this), d.label, (d as any).radius * 2 * 0.8);
        });

        simulation.on("tick", () => {
            link.attr("d", d => {
                const source = d.source as any;
                const target = d.target as any;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                
                const targetRadius = target.radius || 15;
                const ratio = dr > 0 ? (dr - targetRadius - 3) / dr : 0;
                const endX = source.x + dx * ratio;
                const endY = source.y + dy * ratio;

                return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${endX},${endY}`;
            });

            node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
        });

        const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
        
        simulation.on("end", fitToView);
        svg.call(zoom);
        zoomRef.current = zoom; 

    }, [data, isMounted, theme, fitToView]);

    const currentTheme = themes[theme];

    return (
        <div className="relative w-full h-full rounded-lg border overflow-hidden transition-colors" style={{ backgroundColor: currentTheme.bg, borderColor: currentTheme.borderLegend }}>
            <svg ref={svgRef} className="w-full h-full"></svg>
            <Legend theme={theme}/>
            {tooltip.visible && (
                <div
                    className="absolute p-3 rounded-md border shadow-lg text-xs backdrop-blur-sm max-w-sm transition-colors"
                    style={{
                        top: tooltip.y,
                        left: tooltip.x,
                        backgroundColor: currentTheme.bgTooltip,
                        borderColor: currentTheme.borderTooltip,
                        color: currentTheme.textTooltip,
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -100%)', // Adjust to appear above cursor
                    }}
                >
                    <pre><code className="font-mono">{tooltip.content}</code></pre>
                </div>
            )}
        </div>
    );
});

export default GraphViewer;