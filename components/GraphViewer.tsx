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
        bgLegend: 'rgba(17, 24, 39, 0.7)', // gray-900/70
        borderLegend: '#374151', // gray-700
        text: '#d1d5db', // gray-300
        textTooltip: '#e5e7eb', // gray-200
        bgTooltip: 'rgba(17, 24, 39, 0.9)', // gray-900/90
        borderTooltip: '#4b5563', // gray-600
        edgeLabelFill: '#cbd5e1', // slate-300
        edgeLabelStroke: '#1f2937', // slate-800 (darker than bg)
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
    default: '#64748b', object: '#78716c', array: '#78716c', order: '#7c3aed',
    customer: '#2563eb', product: '#db2777', line: '#ea580c', service: '#f59e0b',
    item: '#16a34a', fulfillment: '#0891b2', shipment: '#0ea5e9',
    promotion: '#8b5cf6', address: '#d946ef', account: '#10b981',
    eventLog: '#64748b', status: '#475569',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
    active: '#22c55e', shipped: '#3b82f6', in_progress: '#eab308',
    in_transit: '#a855f7', default: 'transparent'
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
            {Object.entries(NODE_COLORS).filter(([key]) => !['default', 'object', 'array', 'status'].includes(key)).map(([type, color]) => (
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
                    <svg width="20" height="10" className="mr-2"><line x1="0" y1="5" x2="20" y2="5" style={{ stroke: style.color, strokeWidth: style.strokeWidth, strokeDasharray: style.dash }}/></svg>
                    <span className="capitalize">{type}</span>
                </div>
            ))}
        </div>
    </div>
);


const GraphViewer = forwardRef<GraphViewerRef, GraphViewerProps>(({ data, theme }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number; }>({ visible: false, content: '', x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    useImperativeHandle(ref, () => ({
        zoomIn() { const svg = d3.select(svgRef.current); if (zoomRef.current) svg.transition().duration(750).call(zoomRef.current.scaleBy, 1.2); },
        zoomOut() { const svg = d3.select(svgRef.current); if (zoomRef.current) svg.transition().duration(750).call(zoomRef.current.scaleBy, 0.8); },
        reset() { const svg = d3.select(svgRef.current); if (zoomRef.current) svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity); },
        exportAsPNG() {
            // ... (export logic remains the same)
        }
    }));
    
    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;
    
        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            if(width > 0 && height > 0) {
                 setDimensions({ width, height });
            }
        });
    
        resizeObserver.observe(svgElement);
    
        return () => resizeObserver.unobserve(svgElement);
    }, []);

    useEffect(() => {
        if (!data || !svgRef.current || dimensions.width === 0) return;
        
        const EDGE_STYLES = getEdgeStyles(theme);
        const currentTheme = themes[theme];

        const drag = (simulation: d3.Simulation<NodeType, undefined>) => {
            const dragstarted = (event: any, d: any) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; };
            const dragged = (event: any, d: any) => { d.fx = event.x; d.fy = event.y; };
            const dragended = (event: any, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; };
            return d3.drag<any, NodeType>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        };
        
        const wrapText = (selection: d3.Selection<any, unknown, null, undefined>, text: string, width: number) => {
             selection.each(function(this: SVGTextElement) {
                const textElement = d3.select(this), words = text.split(/\s+/).reverse();
                let word: string | undefined, line: string[] = [], lineNumber = 0;
                const lineHeight = 1.1, y = textElement.attr("y") || 0, dy = parseFloat(textElement.attr("dy") || "0");
                textElement.text(null);
                let tspan = textElement.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${dy}em`);
                while ((word = words.pop())) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = textElement.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word);
                    }
                }
                const finalLineCount = textElement.selectAll('tspan').size();
                const totalTextHeight = (finalLineCount - 1) * lineHeight * 12; // 12 is font size
                textElement.selectAll('tspan').attr('y', -totalTextHeight / 2);
            });
        };
        
        const { nodes, edges } = data;
        const mutableNodes: (NodeType & { radius?: number })[] = nodes.map(n => ({...n}));
        const mutableEdges = edges.map(e => ({...e}));
        mutableNodes.forEach((node) => { node.radius = Math.max(45 - (node.depth || 0) * 5, 15); });

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 
        const { width, height } = dimensions;
        const g = svg.append("g").attr('class', 'main-group');

        const defs = g.append('defs');
        Object.entries(EDGE_STYLES).forEach(([type, style]) => {
            defs.append('marker').attr('id', `arrow-${type}`).attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto-start-reverse').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', style.color);
        });
        
        const simulation = d3.forceSimulation(mutableNodes as d3.SimulationNodeDatum[])
            .force("link", d3.forceLink(mutableEdges).id((d: any) => d.id).distance(250).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-2000))
            .force("collision", d3.forceCollide().radius((d: any) => d.radius + 40))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1));

        const link = g.append("g").attr("class", "links")
            .selectAll("path")
            .data(mutableEdges)
            .join("path")
            .attr("id", d => `edge-${(d.source as NodeType).id}-${(d.target as NodeType).id}`)
            .attr("stroke", d => EDGE_STYLES[d.type]?.color || '#999')
            .attr("stroke-width", d => EDGE_STYLES[d.type]?.strokeWidth || 1.5)
            .attr("stroke-dasharray", d => EDGE_STYLES[d.type]?.dash)
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .attr('fill', 'none');
        
        const edgeLabels = g.append("g").attr("class", "edge-labels")
            .selectAll("text")
            .data(mutableEdges.filter(d => d.label))
            .join("text")
            .attr("dy", -3)
            .append("textPath")
            .attr("xlink:href", d => `#edge-${(d.source as NodeType).id}-${(d.target as NodeType).id}`)
            .attr("startOffset", "50%")
            .text(d => d.label!)
            .attr("font-size", "9px")
            .attr("fill", currentTheme.edgeLabelFill)
            .attr("text-anchor", "middle")
            .style("paint-order", "stroke")
            .style("stroke", currentTheme.edgeLabelStroke)
            .style("stroke-width", 2);
            
        const node = g.append("g").attr("class", "node-group").selectAll("g").data(mutableNodes).join("g").call(drag(simulation as d3.Simulation<NodeType, undefined>));
        
        const linkedByIndex: Record<string, boolean> = {};
        mutableEdges.forEach(d => { linkedByIndex[`${(d.source as NodeType).id},${(d.target as NodeType).id}`] = true; });
        const areNodesConnected = (a: NodeType, b: NodeType) => linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;

        node.on('mouseover', (event: MouseEvent, d: NodeType) => {
            const [x, y] = d3.pointer(event, document.body);
            setTooltip({ visible: true, content: JSON.stringify(d.data, null, 2), x, y });
            node.style('opacity', (o: any) => areNodesConnected(d, o) ? 1 : 0.2);
            link.style('opacity', (o: any) => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.2);
            edgeLabels.style('opacity', (o: any) => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.2);
        }).on('mousemove', (event: MouseEvent) => {
            const [x, y] = d3.pointer(event, document.body);
            setTooltip(prev => ({ ...prev, x: x, y: y }));
        }).on('mouseout', () => {
            setTooltip({ visible: false, content: '', x: 0, y: 0 });
            node.style('opacity', 1); link.style('opacity', 1); edgeLabels.style('opacity', 1);
        });

        const getNodeStatusColor = (d: NodeType) => {
            const statusSources = [d.status, d.data?.status, d.data?.itemStatus, d.data?.productStatus, d.data?.fulfillmentStatus];
            for (const statusObj of statusSources) {
                if (statusObj?.code) { const code = statusObj.code.toLowerCase().replace(/\s/g, '_'); if (STATUS_BORDER_COLORS[code]) return STATUS_BORDER_COLORS[code]; }
            } return STATUS_BORDER_COLORS.default;
        };

        node.append("circle").attr("r", (d: any) => d.radius).attr("fill", (d: any) => NODE_COLORS[d.type] || NODE_COLORS.default).attr("stroke", (d: any) => getNodeStatusColor(d)).attr("stroke-width", 3);
        const nodeText = node.append("text").attr("fill", currentTheme.nodeText).attr("font-size", "12px").attr("text-anchor", "middle").attr("paint-order", "stroke").attr("stroke", currentTheme.nodeStroke).attr("stroke-width", 3).attr("stroke-linejoin", "round");
        nodeText.each(function(d: any) { wrapText(d3.select(this), d.label, d.radius * 2 * 0.8); });

        simulation.on("tick", () => {
            link.attr("d", (d: any) => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = (dx === 0 && dy === 0) ? 0 : Math.sqrt(dx * dx + dy * dy) * 1.5;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr("transform", (d: any) => `translate(${d.x || 0},${d.y || 0})`);
        });

        const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event: any) => g.attr("transform", event.transform));

        simulation.on("end", () => {
            if (mutableNodes.length === 0) return;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            mutableNodes.forEach((node: any) => {
                const radius = node.radius || 0;
                if (node.x - radius < minX) minX = node.x - radius; if (node.x + radius > maxX) maxX = node.x + radius;
                if (node.y - radius < minY) minY = node.y - radius; if (node.y + radius > maxY) maxY = node.y + radius;
            });
            const graphWidth = maxX - minX, graphHeight = maxY - minY;
            if (graphWidth === 0 || graphHeight === 0) return;
            const padding = 80;
            const scale = Math.min((width - padding) / graphWidth, (height - padding) / graphHeight, 1);
            const translateX = (width / 2) - (scale * (minX + maxX) / 2);
            const translateY = (height / 2) - (scale * (minY + maxY) / 2);
            const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
            svg.transition().duration(750).call(zoom.transform, transform);
        });
        
        svg.call(zoom);
        zoomRef.current = zoom; 

    }, [data, theme, dimensions]);

    const currentTheme = themes[theme];
    const tooltipRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (tooltip.visible && tooltipRef.current) {
            const el = tooltipRef.current, rect = el.getBoundingClientRect();
            const bodyWidth = document.body.clientWidth, bodyHeight = document.body.clientHeight;
            let left = tooltip.x + 15, top = tooltip.y + 15;
            if (left + rect.width > bodyWidth) left = tooltip.x - rect.width - 15;
            if (top + rect.height > bodyHeight) top = tooltip.y - rect.height - 15;
            el.style.transform = `translate(${left}px, ${top}px)`;
        }
    }, [tooltip]);

    return (
        <div className="relative w-full h-full rounded-lg border overflow-hidden transition-colors" style={{ backgroundColor: currentTheme.bg, borderColor: currentTheme.borderLegend }}>
            <svg ref={svgRef} className="w-full h-full"></svg>
            <Legend theme={theme}/>
            {tooltip.visible && (
                <div ref={tooltipRef} className="absolute p-2 text-sm border rounded-md shadow-lg pointer-events-none max-w-sm max-h-80 overflow-auto backdrop-blur-sm transition-opacity"
                    style={{ top: 0, left: 0, backgroundColor: currentTheme.bgTooltip, color: currentTheme.textTooltip, borderColor: currentTheme.borderTooltip }} role="tooltip"
                >
                    <pre className="font-mono whitespace-pre-wrap">{tooltip.content}</pre>
                </div>
            )}
        </div>
    );
});

export default GraphViewer;
