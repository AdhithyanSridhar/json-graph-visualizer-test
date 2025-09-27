import { Node, Edge, GraphData } from '../types';

let nodeIdCounter = 0;

// Heuristic to determine the 'type' of an object for color-coding
const getNodeType = (data: any): string => {
    if (Array.isArray(data)) return 'array';
    if (typeof data !== 'object' || data === null) return 'primitive';
    if ('orderId' in data) return 'order';
    if ('productId' in data) return 'product';
    if ('lineNumber' in data) return 'line';
    if ('itemId' in data) return 'item';
    if ('fulfillmentId' in data) return 'fulfillment';
    if ('shipmentId' in data) return 'shipment';
    if ('agreementId' in data) return 'agreement';
    if ('promoCode' in data) return 'promotion';
    if ('serviceId' in data) return 'service';
    if ('address' in data && 'type' in data) return 'address';
    return 'object';
};

const getBusinessId = (data: any): string | null => {
    const idKeys = ['orderId', 'productId', 'lineNumber', 'itemId', 'fulfillmentId', 'shipmentId', 'agreementId', 'promoCode', 'serviceId'];
    for (const key of idKeys) {
        if (key in data) return data[key];
    }
    return null;
}

const traverseAndBuildNodes = (
    data: any,
    parentId: string | null,
    nodes: Node[],
    edges: Edge[],
    key: string | null,
    depth: number,
    maps: {
        businessIdToNodeId: Map<string, string>;
        sequenceToNodeId: Map<string, Map<number, string>>;
        nodeIdToNode: Map<string, Node>;
    }
): string | null => {
    if (data === null || data === undefined || typeof data !== 'object') {
        // We are filtering out primitive nodes from the main graph view
        return null;
    }

    const currentNodeId = `node-${nodeIdCounter++}`;
    const type = getNodeType(data);
    let label = type;

    const businessId = getBusinessId(data);
    if (businessId) {
        label = `${type}: ${businessId}`;
        maps.businessIdToNodeId.set(businessId, currentNodeId);
    } else if (type === 'array') {
        label = `[ Array (${data.length}) ]`;
    }

    if (key) {
        label = key.startsWith('[') ? label : `${key}: ${label}`;
    }

    const status = data.status || (data.milestones ? { applicableMilestone: data.milestones.applicableMilestone } : undefined);
    const node: Node = { id: currentNodeId, label, depth, data, type, status };
    nodes.push(node);
    maps.nodeIdToNode.set(currentNodeId, node);

    if (parentId) {
        edges.push({ source: parentId, target: currentNodeId, type: 'default' });
    }

    // Map sequences
    if (data.sequenceNumber !== undefined) {
        if (!maps.sequenceToNodeId.has(type)) {
            maps.sequenceToNodeId.set(type, new Map());
        }
        maps.sequenceToNodeId.get(type)!.set(data.sequenceNumber, currentNodeId);
    }
     if (data.addressSequence !== undefined && type === 'address') { // Special for addresses that dont have a type
        if (!maps.sequenceToNodeId.has('address')) {
            maps.sequenceToNodeId.set('address', new Map());
        }
        maps.sequenceToNodeId.get('address')!.set(data.addressSequence, currentNodeId);
     }


    if (Array.isArray(data)) {
        const hasSequence = data.length > 0 && data.every(item => typeof item === 'object' && item !== null && 'sequenceNumber' in item && typeof item.sequenceNumber === 'number');
        let itemsToProcess = data;
        if (hasSequence) {
            itemsToProcess = [...data].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        }
        let prevChildId: string | null = null;
        itemsToProcess.forEach((item, index) => {
            const childId = traverseAndBuildNodes(item, currentNodeId, nodes, edges, `[${index}]`, depth + 1, maps);
            if (hasSequence && prevChildId && childId) {
                edges.push({ source: prevChildId, target: childId, type: 'sequence' });
            }
            prevChildId = childId;
        });
    } else {
        for (const [k, v] of Object.entries(data)) {
            traverseAndBuildNodes(v, currentNodeId, nodes, edges, k, depth + 1, maps);
        }
    }

    return currentNodeId;
};

const createSpecialEdges = (
    edges: Edge[],
    maps: {
        businessIdToNodeId: Map<string, string>;
        sequenceToNodeId: Map<string, Map<number, string>>;
        nodeIdToNode: Map<string, Node>;
    },
    originalData: any
) => {
    // Create reference edges
    for (const node of maps.nodeIdToNode.values()) {
        const data = node.data;
        if (!data || typeof data !== 'object') continue;

        const refs: { seq: number | undefined, type: string }[] = [
            { seq: data.fulfillmentSequence, type: 'fulfillment' },
            { seq: data.addressSequence, type: 'address' }
        ];

        for (const ref of refs) {
            if (ref.seq !== undefined && maps.sequenceToNodeId.has(ref.type)) {
                const targetNodeId = maps.sequenceToNodeId.get(ref.type)!.get(ref.seq);
                if (targetNodeId) {
                    edges.push({ source: node.id, target: targetNodeId, type: 'reference' });
                }
            }
        }
    }

    // Create amendment edges
    if (originalData.order?.amendedDetails && Array.isArray(originalData.order.amendedDetails)) {
        for (const detail of originalData.order.amendedDetails) {
            const { newId, oldId } = detail;
            const sourceNodeId = maps.businessIdToNodeId.get(newId);
            const targetNodeId = maps.businessIdToNodeId.get(oldId);
            if (sourceNodeId && targetNodeId) {
                edges.push({ source: sourceNodeId, target: targetNodeId, type: 'amendment' });
            }
        }
    }
};

export const jsonToGraphData = (jsonString: string): GraphData => {
    try {
        const data = JSON.parse(jsonString);
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        nodeIdCounter = 0;

        const maps = {
            businessIdToNodeId: new Map<string, string>(),
            sequenceToNodeId: new Map<string, Map<number, string>>(),
            nodeIdToNode: new Map<string, Node>(),
        };

        traverseAndBuildNodes(data, null, nodes, edges, null, 0, maps);
        createSpecialEdges(edges, maps, data);

        return { nodes, edges };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
        throw new Error('An unknown error occurred while parsing JSON.');
    }
};
