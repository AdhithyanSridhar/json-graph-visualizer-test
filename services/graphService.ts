import { Node, Edge, GraphData } from '../types';

let nodeIdCounter = 0;

// This new function builds a high-level, summarized graph based on the user's specific requirements.
export const jsonToGraphData = (jsonString: string): GraphData => {
    try {
        const data = JSON.parse(jsonString);
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        nodeIdCounter = 0;

        const maps = {
            sequenceToNodeId: new Map<string, Map<number, string>>(),
            idToNodeId: new Map<string, string>(),
        };

        if (typeof data !== 'object' || data === null) {
            return { nodes: [], edges: [] };
        }

        // Helper to create a node and add it to the graph
        const addNode = (label: string, type: string, parent: string | null, nodeData: any, depth: number): string => {
            const id = `node-${nodeIdCounter++}`;
            nodes.push({ id, label, type, data: nodeData, depth });
            if (parent) {
                edges.push({ source: parent, target: id, type: 'default' });
            }
            return id;
        };
        
        // 1. Create the main 'orderVertex' node
        const orderVertexData = { orderId: data.orderId, orderDate: data.orderDate, orderingChannel: data.orderingChannel, originatingSystem: data.originatingSystem };
        const orderNodeId = addNode(`Order: ${data.orderId}`, 'order', null, orderVertexData, 0);

        // 2. Add high-level order properties as separate nodes
        if (data.orderContext) addNode(`Context: ${data.orderContext}`, 'object', orderNodeId, { orderContext: data.orderContext }, 1);
        if (data.isCancelable !== undefined) addNode(`Cancelable: ${data.isCancelable}`, 'object', orderNodeId, { isCancelable: data.isCancelable }, 1);
        if (data.isAmendable !== undefined) addNode(`Amendable: ${data.isAmendable}`, 'object', orderNodeId, { isAmendable: data.isAmendable }, 1);
        if (data.Customer) addNode(`Customer: ${data.Customer.firstName} ${data.Customer.lastName}`, 'customer', orderNodeId, data.Customer, 1);

        // 3. Process Products and their nested children
        data.products?.forEach((product: any) => {
            const productLabel = `Product: ${product.productSequenceNumber}#${product.lineOfBusiness}`;
            const productNodeId = addNode(productLabel, 'product', orderNodeId, product, 1);
            
            if (product.productSequenceNumber) {
                if (!maps.sequenceToNodeId.has('product')) maps.sequenceToNodeId.set('product', new Map());
                maps.sequenceToNodeId.get('product')!.set(product.productSequenceNumber, productNodeId);
            }
            
            if (product.productStatus) addNode(`Status: ${product.productStatus.code}, ${product.productStatus.milestone}`, 'status', productNodeId, product.productStatus, 2);

            product.lines?.forEach((line: any) => {
                const lineLabel = `Line: ${line.name}#${line.lineSequence}#${line.lineType}#${line.lineAction}`;
                const lineNodeId = addNode(lineLabel, 'line', productNodeId, line, 2);
                if (line.lineSequence) {
                    if (!maps.sequenceToNodeId.has('line')) maps.sequenceToNodeId.set('line', new Map());
                    maps.sequenceToNodeId.get('line')!.set(line.lineSequence, lineNodeId);
                }
                if (line.lineStatus) addNode(`Status: ${line.lineStatus.code}, ${line.lineStatus.milestone} (${new Date(line.activationDate).toLocaleDateString()})`, 'status', lineNodeId, { ...line.lineStatus, activationDate: line.activationDate }, 3);

                line.services?.forEach((service: any) => {
                    const serviceLabel = `Service: ${service.name}#${service.serviceSequence}#${service.type}#${service.serviceType}#${service.action}`;
                    const serviceNodeId = addNode(serviceLabel, 'service', lineNodeId, service, 3);
                    if (service.serviceSequence) {
                        if (!maps.sequenceToNodeId.has('service')) maps.sequenceToNodeId.set('service', new Map());
                        maps.sequenceToNodeId.get('service')!.set(service.serviceSequence, serviceNodeId);
                    }
                });
            });
            
            product.items?.forEach((item: any) => {
                const itemLabel = `Item: ${item.id}#${item.itemSequences?.[0] || ''}#${item.itemType}#${item.itemDescription}#${item.itemAction}`;
                const itemNodeId = addNode(itemLabel, 'item', productNodeId, item, 2);
                if (item.id) maps.idToNodeId.set(item.id, itemNodeId);
                if (item.isReturnItem !== undefined) addNode(`Return: ${item.isReturnItem}`, 'object', itemNodeId, { isReturnItem: item.isReturnItem }, 3);
                if (item.itemStatus) addNode(`Status: ${item.itemStatus.code}, ${item.itemStatus.milestone}`, 'status', itemNodeId, item.itemStatus, 3);
                item.deviceDetails?.forEach((device: any) => addNode(`Device: ${device.sku}#${device.skuDescription}`, 'object', itemNodeId, device, 3));
            });

            if(product.aggrements) {
                 const tcKeys = product.aggrements.map((a: any) => a.tcKey).join(', ');
                 addNode(`Agreements: ${tcKeys}`, 'object', productNodeId, product.aggrements, 2);
            }
        });

        // 4. Process Fulfillments and Shipments
        data.fulfillments?.forEach((fulfillment: any) => {
            const label = `Fulfillment: ${fulfillment.fulfillmentSequence}#${fulfillment.type}#${fulfillment.name}#${fulfillment.fulfillmentType}`;
            const fulfillmentNodeId = addNode(label, 'fulfillment', orderNodeId, fulfillment, 1);
            if (fulfillment.fulfillmentSequence) {
                if (!maps.sequenceToNodeId.has('fulfillment')) maps.sequenceToNodeId.set('fulfillment', new Map());
                maps.sequenceToNodeId.get('fulfillment')!.set(fulfillment.fulfillmentSequence, fulfillmentNodeId);
            }
            if (fulfillment.fulfillmentStatus) addNode(`Status: ${fulfillment.fulfillmentStatus.code}`, 'status', fulfillmentNodeId, fulfillment.fulfillmentStatus, 2);
            
            fulfillment.shipments?.forEach((shipment: any) => {
                const shipmentLabel = `Shipment: ${shipment.shipmentSequence}#${shipment.carrier}#${new Date(shipment.shippedDate).toLocaleDateString()}`;
                const shipmentNodeId = addNode(shipmentLabel, 'shipment', fulfillmentNodeId, shipment, 2);
                if (shipment.shipmentStatus) addNode(`Status: ${shipment.shipmentStatus}`, 'status', shipmentNodeId, { status: shipment.shipmentStatus }, 3);
            });
        });
        
        // 5. Process top-level arrays
        data.promotions?.forEach((promo: any) => {
            const label = `Promo: ${promo.name}#${promo.promotionType}#${new Date(promo.effectiveDate).toLocaleDateString()}#${promo.status}`;
            const promoNodeId = addNode(label, 'promotion', orderNodeId, promo, 1);
            if (promo.promotionSequence) {
                if (!maps.sequenceToNodeId.has('promotion')) maps.sequenceToNodeId.set('promotion', new Map());
                maps.sequenceToNodeId.get('promotion')!.set(promo.promotionSequence, promoNodeId);
            }
        });
        
        data.addresses?.forEach((address: any) => {
            const label = `Address: ${address.addressSequence}#${address.addressClassification}#${address.zip}#${address.addressId}`;
            const addressNodeId = addNode(label, 'address', orderNodeId, address, 1);
            if (address.addressSequence) {
                if (!maps.sequenceToNodeId.has('address')) maps.sequenceToNodeId.set('address', new Map());
                maps.sequenceToNodeId.get('address')!.set(address.addressSequence, addressNodeId);
            }
        });

        data.accounts?.forEach((account: any) => {
            const label = `Account: ${account.accountSequence}#${account.accountType}#${account.accountSubType}#${account.billingDeliveryPreference}`;
            const accountNodeId = addNode(label, 'account', orderNodeId, account, 1);
            if (account.accountSequence) {
                if (!maps.sequenceToNodeId.has('account')) maps.sequenceToNodeId.set('account', new Map());
                maps.sequenceToNodeId.get('account')!.set(account.accountSequence, accountNodeId);
            }
        });

        if (data.eventLog) addNode(`Event Log (${data.eventLog.length})`, 'eventLog', orderNodeId, data.eventLog, 1);
        if (data.orderTotalPrices?.[0]) {
            const price = data.orderTotalPrices[0];
            addNode(`Total: ${price.totalPriceAfterTax}`, 'object', orderNodeId, data.orderTotalPrices, 1);
        }

        createReferenceEdges(nodes, edges, maps);
        return { nodes, edges };

    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
        throw new Error('An unknown error occurred while parsing JSON.');
    }
};

const createReferenceEdges = (
    nodes: Node[],
    edges: Edge[],
    maps: {
        sequenceToNodeId: Map<string, Map<number, string>>;
        idToNodeId: Map<string, string>;
    }
) => {
    const referenceKeys: { prop: string, type: string }[] = [
        { prop: 'accountSequence', type: 'account' },
        { prop: 'addressSequence', type: 'address' },
        { prop: 'serviceAddressSequence', type: 'address' },
        { prop: 'billingAddressSequence', type: 'address' },
        { prop: 'fulfillmentSequence', type: 'fulfillment' },
        { prop: 'lineSequence', type: 'line' },
    ];

    for (const node of nodes) {
        if (!node.data || typeof node.data !== 'object') continue;

        const dataArray = Array.isArray(node.data) ? node.data : [node.data];
        for (const dataItem of dataArray) {
             // Generic sequence number links
            for (const { prop, type } of referenceKeys) {
                const seqNum = dataItem[prop];
                if (typeof seqNum === 'number') {
                    const targetNodeId = maps.sequenceToNodeId.get(type)?.get(seqNum);
                    if (targetNodeId && targetNodeId !== node.id) {
                        edges.push({ source: node.id, target: targetNodeId, type: 'reference' });
                    }
                }
            }
             // Price adjustments to Promotions
            if (dataItem.prices && Array.isArray(dataItem.prices)) {
                for (const price of dataItem.prices) {
                    if (price.adjustments && Array.isArray(price.adjustments)) {
                        for (const adj of price.adjustments) {
                            if (typeof adj.promotionSequence === 'number') {
                                const targetNodeId = maps.sequenceToNodeId.get('promotion')?.get(adj.promotionSequence);
                                if (targetNodeId && targetNodeId !== node.id) {
                                    edges.push({ source: node.id, target: targetNodeId, type: 'reference' });
                                }
                            }
                        }
                    }
                }
            }
        }

        // Line to Items (array of strings)
        if (node.type === 'line' && Array.isArray(node.data.itemSequences)) {
            for (const itemId of node.data.itemSequences) {
                const targetNodeId = maps.idToNodeId.get(itemId);
                if (targetNodeId && targetNodeId !== node.id) {
                     edges.push({ source: node.id, target: targetNodeId, type: 'reference' });
                }
            }
        }

        // Fulfillment to Products (array of strings which are numbers)
        if (node.type === 'fulfillment' && Array.isArray(node.data.productSequenceNumber)) {
            for (const seqStr of node.data.productSequenceNumber) {
                const seqNum = parseInt(seqStr, 10);
                if (!isNaN(seqNum)) {
                    const targetNodeId = maps.sequenceToNodeId.get('product')?.get(seqNum);
                    if (targetNodeId && targetNodeId !== node.id) {
                        edges.push({ source: node.id, target: targetNodeId, type: 'reference' });
                    }
                }
            }
        }
    }
};
