import React, { useState, useCallback } from 'react';
import GraphViewer from './components/GraphViewer';
import { jsonToGraphData } from './services/graphService';
import { GraphData } from './types';

const defaultJson = `{
  "order": {
    "orderId": "ORD12345",
    "status": { "statusCode": "Active", "description": "Order is currently being processed." },
    "amendedDetails": [
      { "newId": "L1-rev2", "oldId": "L1-rev1", "revision": 2, "date": "2023-10-27T11:00:00Z" }
    ],
    "customer": { "customerId": "CUST001", "name": "Jane Doe" },
    "account": { "accountId": "ACC54321", "status": "Active" },
    "products": [
      {
        "productId": "PROD-IPHONE",
        "name": "iPhone 15 Pro",
        "lines": [
          {
            "lineNumber": "L1-rev1",
            "plan": "Unlimited Basic",
            "status": { "statusCode": "Cancelled", "description": "Superseded by revision 2." },
            "addressSequence": 1
          },
          {
            "lineNumber": "L1-rev2",
            "plan": "Unlimited Pro",
            "status": { "statusCode": "Active", "description": "Current active line." },
            "addressSequence": 1,
            "items": [
              {
                "itemId": "ITEM001",
                "type": "device",
                "fulfillmentSequence": 1,
                "milestones": { "applicableMilestone": "Shipped" },
                "deviceDetails": { "imei": "123456789012345", "color": "Titanium" }
              }
            ],
            "services": [
              {
                "serviceId": "SERV-INS",
                "name": "Device Insurance",
                "cancelRequestService": { "cancellable": true, "reason": "Not Required" }
              }
            ]
          }
        ]
      }
    ],
    "prices": { "subtotal": 1099.00, "tax": 87.92, "total": 1186.92 },
    "promotions": [ { "promoCode": "NEWDEVICE200", "discount": 200.00 } ],
    "addresses": [
      { "type": "shipping", "address": "123 Main St, Anytown, USA", "addressSequence": 1, "status": { "statusCode": "Active" } },
      { "type": "billing", "address": "123 Main St, Anytown, USA", "addressSequence": 2, "status": { "statusCode": "Active" } }
    ],
    "fulfillments": [
      {
        "fulfillmentId": "FUL-001",
        "sequenceNumber": 1,
        "addressSequence": 1,
        "milestones": { "applicableMilestone": "Shipped" },
        "status": { "statusCode": "Processing" },
        "shipments": [
          {
            "shipmentId": "SHP-001A",
            "carrier": "FedEx",
            "trackingNumber": "FX123456789"
          }
        ]
      },
      {
        "fulfillmentId": "FUL-002",
        "sequenceNumber": 2,
        "addressSequence": 2,
        "milestones": { "applicableMilestone": "Started" },
        "status": { "statusCode": "Pending" },
        "shipments": []
      }
    ],
    "agreements": [ { "agreementId": "AGR-001", "type": "Terms of Service", "accepted": true } ]
  }
}`;

const App: React.FC = () => {
    const [jsonInput, setJsonInput] = useState<string>(defaultJson);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleVisualize = useCallback(() => {
        setError(null);
        setIsLoading(true);
        setGraphData(null);
        
        setTimeout(() => {
            try {
                const data = jsonToGraphData(jsonInput);
                setGraphData(data);
            } catch (e) {
                if (e instanceof Error) {
                    setError(e.message);
                } else {
                    setError("An unknown error occurred.");
                }
            } finally {
                setIsLoading(false);
            }
        }, 200); // Short delay for user feedback

    }, [jsonInput]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col p-4 lg:p-6 font-sans">
            <header className="mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-indigo-400">JSON Graph Visualizer</h1>
                <p className="text-gray-400 mt-1">Paste your JSON data to see its structure as an interactive graph.</p>
            </header>

            <div className="flex flex-col lg:flex-row flex-grow gap-6">
                <div className="lg:w-1/4 flex flex-col">
                    <div className="flex-grow flex flex-col bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
                        <div className="p-4 border-b border-gray-700">
                            <label htmlFor="json-input" className="block text-sm font-medium text-gray-300 mb-2">JSON Input</label>
                            <textarea
                                id="json-input"
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="w-full h-64 lg:flex-grow p-3 bg-gray-900 border border-gray-600 rounded-md text-sm text-cyan-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                                placeholder="Enter valid JSON here..."
                                aria-label="JSON Input Area"
                            />
                        </div>
                        <div className="p-4">
                            <button
                                onClick={handleVisualize}
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md"
                                aria-label="Visualize JSON as Graph"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="status" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    'GO'
                                )}
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm" role="alert">
                                    <p className="font-bold">Error:</p>
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <main className="lg:w-3/4 flex-grow min-h-[400px] lg:min-h-0">
                    { !isLoading && !graphData && !error && (
                        <div className="w-full h-full bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-8 text-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10m0-2s2 2 3 3m2-8a2 2 0 11-4 0 2 2 0 014 0zM4.343 4.343a8 8 0 0111.314 11.314m-1.414-1.414a2 2 0 10-2.828-2.828 2 2 0 002.828 2.828z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-400">Graph will be rendered here</h2>
                            <p className="text-gray-500 mt-2">Enter your JSON on the left and click "GO" to visualize the data structure.</p>
                        </div>
                    )}
                    {(isLoading || graphData) && <GraphViewer data={graphData} />}
                </main>
            </div>
        </div>
    );
};

export default App;
