const options = {
  openapi: 'OpenAPI 3',
  language: 'en-US',
  disableLogs: false,
  autoHeaders: false,
  autoQuery: false,
  autoBody: false
}
const generateSwagger = require('swagger-autogen')()

const swaggerDocument = {
  info: {
    version: '1.0.0',
    title: 'Traceability Node APIs',
    description: 'API related to Traceability Express Server'
  },
  host: 'localhost:5500',
  basePath: '/traceability-node-api/api/v1',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Farmers',
      description: 'Farmer Member related endpoints'
    },
    {
      name: 'Farmer Produce',
      description: 'Farmer Produce related endpoints'
    },
    {
      name: 'Batches',
      description: 'Endpoints related to batch operations'
    },
    {
      name: 'Lots',
      description: 'Endpoints related to lot operations'
    },
    {
      name: 'Product',
      description: 'Product related endpoints'
    }
  ],
  definitions: {
    BatchList: {
      type: 'array',
      items: {
        $ref: '#/definitions/Batch'
      }
    },
    Batch: {
      batchId: '60d725b1b0d7c90015f9f7b1',
      product: 'Robusta Coffee',
      isDeleted: false,
      isReadyForLot: true,
      batchStatus: 'ADD',
      type: 'BATCH',
      modalFieldCombined: [
        {
          modalFieldId: 'modalFieldId1',
          columnStatus: 'ADD',
          fields: [
            {
              name: 'fieldName1',
              value: 'fieldValue1'
            }
          ]
        }
      ],
      farmerProduceIds: ['farmerProduceId1', 'farmerProduceId2'],
      flag: false,
      flagReason: []
    },
    BatchAggregation: {
      isReadyForLot: {
        count: 10
      },
      type: {
        BATCH: 5,
        OTHER: 3
      }
    },
    FarmerProduceList: {
      type: 'array',
      items: {
        $ref: '#/definitions/FarmerProduce'
      }
    },
    FarmerProduce: {
      $farmerId: '60d725b1b0d7c90015f9f7b1',
      produceType: 'Corn',
      quantity: 100,
      harvestDate: '2023-06-15'
      // Add other relevant fields
    },
    FarmerProduceAggregation: {
      produceType: {
        Corn: 50,
        Wheat: 30
        // Other produce types
      },
      quantity: {
        min: 10,
        max: 1000
      }
    },
    ODKFetchResponse: {
      message:
        'Data fetching from odk is completed. Data is synced to server now.',
      LastFetchedTime: '2023-06-15T10:30:00Z',
      updatedLastFetchedTime: '2023-06-15T11:00:00Z',
      lengthOfData: 10
    },
    Product: {
      $productId: '60d725b1b0d7c90015f9f7b1',
      productName: 'Sample Product',
      description: 'This is a sample product',
      columns: ['column1', 'column2']
    },
    LastSyncedTime: {
      lastFetchedTime: '2023-06-15T10:30:00Z'
    },

    LotList: {
      type: 'array',
      items: {
        $ref: '#/definitions/Lot'
      }
    },
    Lot: {
      lotId: '60d725b1b0d7c90015f9f7b1',
      productId: 'Robusta Coffee',
      lotStatus: 'AT_CO_OPERATIVE',
      isDeleted: false,
      modalFieldCombined: [
        {
          modalFieldId: 'modalFieldId1',
          columnStatus: ' ADD',
          fields: [
            {
              name: 'fieldName1',
              value: 'fieldValue1'
            }
          ]
        }
      ],
      batchIds: ['batchId1', 'batchId2'],
      flag: false,
      flagReason: []
    },
    LotAggregation: {
      isReadyForLot: {
        count: 10
      }
    },

    FarmerList: {
      type: 'array',
      items: {
        $ref: '#/definitions/Farmer'
      }
    },
    Farmer: {
      farmerId: 'farmerId1',
      farmerName: 'John Doe',
      cc: 'CC1',
      noOfFarmPlots: 2,
      centroid: {
        type: 'Point',
        coordinates: [12.3456, 78.9012]
      }
    },
    FarmerLocationList: {
      type: 'array',
      items: {
        $ref: '#/definitions/FarmerLocation'
      }
    },
    FarmerLocation: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [12.3456, 78.9012]
      },
      properties: {
        name: 'John Doe',
        _id: 'farmerId1',
        farmerId: 'farmerId1',
        cc: 'CC1',
        batchId: 'batchId1',
        noOfFarms: 2
      }
    },
    ActivityList: {
      type: 'array',
      items: {
        $ref: '#/definitions/Activity'
      }
    },
    Activity: {
      activityId: 'activityId1',
      activityHolderId: 'lotId1',
      activityHolderType: 'LOT',
      authorId: 'userId1',
      dateCreated: '2023-06-15T10:30:00Z',
      activityType: 'LOT_CREATION',
      activityDescription: 'Lot: Lot1 created.'
    },
    DeleteResult: {
      result: 'All lots and batches deleted successfully.',
      result2: 'All lots deleted successfully.'
    }
  },
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header'
    }
  }
}
const swaggerFile = './docs/swagger.json'
const apiRouteFile = ['./app.ts']
generateSwagger(swaggerFile, apiRouteFile, swaggerDocument)
