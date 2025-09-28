import React, { useState, useCallback, useEffect } from 'react';
import GraphViewer from './components/GraphViewer';
import { jsonToGraphData } from './services/graphService';
import { GraphData } from './types';

const defaultJson = `{
  "orderId": "ORD-ULTIMATE-2024",
  "revision": 3,
  "orderDate": "2024-08-01T10:00:00Z",
  "orderModifiedDate": "2024-08-01T11:30:00Z",
  "orderingChannel": "WEB",
  "originatingSystem": "ECommercePlatform",
  "requestingSystemId": "WebApp-UI",
  "orderContext": "NEW_CUSTOMER_SIGNUP",
  "isCancelable": true,
  "isAmendable": true,
  "Customer": {
    "globalUserId": "GUID-JSMITH-12345",
    "firstName": "John",
    "lastName": "Smith",
    "emailAddress": "john.smith@example.com",
    "phoneNumbers": ["+1-555-123-4567", "+1-555-987-6543"],
    "creditChecks": ["PASSED_2024-08-01"]
  },
  "products": [
    {
      "id": "PROD-MOBILE-001",
      "name": "5G Ultimate Mobile Bundle",
      "productStatus": {
        "code": "Active",
        "internalState": "Provisioned",
        "applicableMilestones": [{"id": "ACTIVATED", "name": "Service Activated"}],
        "milestone": "ACTIVATED"
      },
      "productSequenceNumber": 1,
      "catalogId": {},
      "characteristics": ["HIGH_SPEED_DATA", "UNLIMITED_TALK_TEXT"],
      "lineOfBusiness": "WIRELESS",
      "accountSequence": 1,
      "lines": [
        {
          "id": "LINE-MOBILE-PLAN-001",
          "lineSequence": 1,
          "name": "5G Ultimate Plan",
          "catalogId": {},
          "characteristics": ["PRIORITY_DATA"],
          "lineType": "SUBSCRIPTION",
          "productType": "SERVICE",
          "accountSequence": 1,
          "services": [
            {
              "type": "ADD_ON",
              "serviceSequence": 1,
              "name": "International Calling Pack",
              "serviceType": "RECURRING",
              "id": "SERV-INTL-CALL",
              "catalogId": {},
              "characteristics": ["1000_MINUTES"],
              "sericeProductType": "VOICE_FEATURE",
              "action": "ADD",
              "productReferenceId": "PROD-MOBILE-001",
              "productRelationshipReferenceId": null,
              "productRelationshipType": "PARENT",
              "prices": [
                {
                  "priceType": "MONTHLY_RECURRING",
                  "unitPrice": 15.00,
                  "adjustments": [],
                  "salePrice": 15.00,
                  "taxes": [{}],
                  "totalTax": 1.20,
                  "totalPriceAfterTax": 16.20,
                  "immediatePayOption": {}
                }
              ]
            }
          ],
          "itemSequences": ["ITEM-PHONE-001"],
          "lineStatus": {
            "code": "Active",
            "clientStatus": "Active",
            "clientSubStatus": "InGoodStanding",
            "applicableMilestones": [{"id": "ACTIVATED", "name": "Activated"}],
            "milestone": "ACTIVATED"
          },
          "type": "MOBILE",
          "lineAction": "ADD",
          "lineId": {"value": "LID-12345"},
          "activationDate": "2024-08-02T00:00:00Z",
          "billingSystem": "BillingSys-A"
        }
      ],
      "items": [
        {
          "id": "ITEM-PHONE-001",
          "itemSequences": ["ITEM-PHONE-001"],
          "catalogId": "CAT-PH-XYZ",
          "itemType": "HANDSET",
          "isHardGood": true,
          "lineSequence": 1,
          "itemDescription": "Latest Smartphone Pro 256GB",
          "itemTypeDescription": "Physical Device",
          "fulfillmentSequence": 1,
          "quantityOrdered": 1,
          "quantityToShip": 1,
          "quantityShipped": 1,
          "quantityDelivered": 0,
          "quantityBackordered": 0,
          "quantityCanceled": 0,
          "isReturnItem": false,
          "estimatedShipDateRange": {"fromDate": "2024-08-02", "toDate": "2024-08-03"},
          "estimatedDeliveryDateRange": {"fromDate": "2024-08-05", "toDate": "2024-08-07"},
          "isCancelable": false,
          "itemStatus": {
            "code": "Shipped",
            "applicableMilestones": [{"id": "SHIPPED", "name": "Item Shipped"}],
            "milestone": "SHIPPED"
          },
          "contractType": "24_MONTH_INSTALLMENT",
          "prices": [
            {
              "priceType": "ONE_TIME",
              "unitPrice": 999.00,
              "adjustments": [{"promotionSequence": 1, "amount": -200.00, "adjustmentType": "PROMOTION"}],
              "salePrice": 799.00,
              "taxes": [{}],
              "totalTax": 63.92,
              "totalPriceAfterTax": 862.92,
              "immediatePayOption": {}
            }
          ],
          "itemAction": "ADD",
          "productReferenceId": "PROD-MOBILE-001",
          "productRelationshipReferenceId": null,
          "productRelationshipType": "PARENT",
          "productOrderItemRelationship": [{"id": "LINE-MOBILE-PLAN-001", "type": "CONTAINS"}],
          "deviceDetails": [{
            "actualMaterialNumber": "HW-SP-PRO-256",
            "manufacturerSerialNumber": "SN-ABC123XYZ",
            "macAddress": "00:1A:2B:3C:4D:5E",
            "ONTID": null,
            "provisioningIndicator": "NEEDS_PROVISIONING",
            "skuWithPrefix": "SKUP-SPPRO256-BLK",
            "skuDescription": "Smartphone Pro 256GB Black",
            "sku": "SPPRO256-BLK",
            "manufacturer": "TechCorp",
            "model": "Pro"
          }]
        }
      ],
      "substitutionGroup": "HIGH_END_DEVICES",
      "productId": {"value": "PID-MOBILE-BUNDLE-XYZ", "type": "INTERNAL", "system": "CatalogSvc"},
      "productOrderItemType": "BUNDLE",
      "serviceAddressSequence": 1,
      "networkProvider": "CarrierX",
      "action": "ADD",
      "prices": [
        {
          "priceType": "MONTHLY_RECURRING",
          "unitPrice": 85.00,
          "adjustments": [{"promotionSequence": 2, "amount": -10.00, "adjustmentType": "PROMOTION"}],
          "salePrice": 75.00,
          "taxes": [{}],
          "totalTax": 6.00,
          "totalPriceAfterTax": 81.00,
          "immediatePayOption": {}
        }
      ],
      "aggrements": [
        {
          "tcAcceptanceFlag": true,
          "tcTimestamp": "2024-08-01T09:59:00Z",
          "tcVersion": "v2.1",
          "tcKey": "WIRELESS_AGREEMENT",
          "tcConsentText": "I agree to the terms.",
          "tcContentCategory": "LEGAL",
          "extensions": [{"name": "IP_ADDRESS", "value": "192.168.1.1"}]
        }
      ],
      "isCancelable": true,
      "platform": "Postpaid"
    }
  ],
  "fulfillments": [
    {
      "type": "SHIPPING",
      "fulfillmentSequence": 1,
      "name": "Primary Device Fulfillment",
      "fulfillmentType": "DELIVERY",
      "fulfillmentMode": "CARRIER",
      "fulfillmentOrderId": {"value": "FUL-XYZ-987", "type": "EXTERNAL", "system": "WarehouseSys"},
      "fulfillmentStatus": {"code": "IN_PROGRESS"},
      "productSequenceNumber": ["1"],
      "addressSequence": 1,
      "shipments": [
        {
          "shipmentSequence": 1,
          "shipmentId": "SHP-123456789",
          "carrier": "UPS",
          "carrierName": "United Parcel Service",
          "trackingURL": "https://ups.com/track?tracknum=1Z...",
          "trackingId": "1ZABC123DEF456",
          "shippedDate": "2024-08-02T18:00:00Z",
          "items": [
            {"itemSeqeuence": "ITEM-PHONE-001", "serialNumber": ["SN-ABC123XYZ"], "quantity": 1}
          ],
          "shipmentStatus": "IN_TRANSIT"
        }
      ]
    }
  ],
  "promotions": [
    {
      "promotionSequence": 1,
      "promotionId": "PROMO-HANDSET-200",
      "applyLevel": "ITEM",
      "name": "$200 Off New Handset",
      "description": "Instant rebate on new smartphone purchase.",
      "amount": 200.00,
      "promotionType": "DISCOUNT",
      "effectiveDate": "2024-08-01",
      "promotionComponentId": "COMP-HS-200",
      "promotionEndDate": "2024-12-31",
      "promotionApplyPolicy": "APPLY_ONCE",
      "status": "ACTIVE"
    },
    {
      "promotionSequence": 2,
      "promotionId": "PROMO-AUTOPAY-10",
      "applyLevel": "ACCOUNT",
      "name": "$10 Off for Autopay",
      "description": "Monthly discount for enabling automatic payments.",
      "amount": 10.00,
      "promotionType": "RECURRING_CREDIT",
      "effectiveDate": "2024-08-01",
      "promotionComponentId": "COMP-AP-10",
      "promotionEndDate": null,
      "promotionApplyPolicy": "APPLY_RECURRING",
      "status": "ACTIVE"
    }
  ],
  "addresses": [
    {
      "addressSequence": 1,
      "addressClassification": "SERVICE_BILLING",
      "name": "John Smith's Residence",
      "address1": "123 Main Street",
      "city": "Anytown",
      "state": "CA",
      "zip": "12345",
      "zipExtension": "6789",
      "country": "USA",
      "addressId": "ADDR-98765"
    }
  ],
  "accounts": [
    {
      "accountSequence": 1,
      "accountNumber": "ACCT-9876543210",
      "name": "J. Smith Wireless",
      "accountType": "CONSUMER",
      "accountSubType": "POSTPAID",
      "autoPay": true,
      "firstName": "John",
      "lastName": "Smith",
      "emailAddress": "john.smith@example.com",
      "billingAddressSequence": 1,
      "serviceAddressSequence": 1,
      "billingCycleDay": 15,
      "phoneNumbers": [{"phoneType": "MOBILE", "phoneNumber": "+1-555-123-4567", "isPrimaryContact": true}],
      "billingDeliveryPreference": "EMAIL"
    }
  ],
  "eventLog": [
    {
      "eventId": "EVT-ORDER-CREATE-001",
      "lineOfBusiness": ["WIRELESS"],
      "orchestrator": "OrderOrchestrator",
      "requestingSystemId": "WebApp-UI",
      "revision": 1,
      "traceId": "TRACE-ABC-123",
      "ogEventmSTimeStamp": "1690884000000"
    }
  ],
  "orderTotalPrices": [
    {
      "priceType": "TOTALS",
      "unitPrice": 1099.00,
      "adjustments": [{"adjustmentType": "PROMOTION", "amount": -210.00}],
      "salePrice": 889.00,
      "totalTax": 71.12,
      "totalPriceAfterTax": 960.12,
      "immediatePayOption": {"payImmediately": true, "payOption": "CREDIT_CARD"}
    }
  ],
  "pointOfNoReturnDate": "2024-08-02T17:00:00Z"
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

    useEffect(() => {
        // Automatically visualize the default JSON on initial load
        handleVisualize();
    }, [handleVisualize]);


    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col p-4 lg:p-6 font-sans">
            <header className="mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-indigo-400">JSON Graph Visualizer</h1>
                <p className="text-gray-400 mt-1">Paste your JSON data to see its structure as an interactive graph.</p>
            </header>

            <div className="flex flex-col lg:flex-row flex-grow gap-6">
                <div className="lg:w-1/3 xl:w-1/4 flex flex-col">
                    <div className="flex-grow flex flex-col bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
                        <div className="p-4 border-b border-gray-700 flex flex-col flex-grow">
                            <label htmlFor="json-input" className="block text-sm font-medium text-gray-300 mb-2">JSON Input</label>
                            <textarea
                                id="json-input"
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="w-full flex-grow p-3 bg-gray-900 border border-gray-600 rounded-md text-sm text-cyan-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
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

                <main className="lg:w-2/3 xl:w-3/4 flex-grow min-h-[400px] lg:min-h-0">
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
