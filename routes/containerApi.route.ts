import { Router } from 'express'
import { authorization, authorizationForChangeRequest } from '../services'
import {
  getContainerCodes,
  getContainerAggregation,
  getContainerDetail,
  createContainer,
  updateContainer,
  getContainerLots
} from '../controllers/containerController'

const router = Router()

/**
 * @swagger
 * /container/all/coCodes:
 *   get:
 *     tags: [Container]
 *     description: Get all container codes with pagination and filtering
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         type: integer
 *         default: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         type: integer
 *         default: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved container list
 *         schema:
 *           $ref: '#/definitions/ContainerList'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/all/coCodes', authorization('UNION'), getContainerCodes)

/**
 * @swagger
 * /container/aggregation/all:
 *   get:
 *     tags: [Container]
 *     description: Get aggregated container data including type, quantity, and status counts
 *     responses:
 *       200:
 *         description: Successfully retrieved aggregated container data
 *         schema:
 *           $ref: '#/definitions/ContainerAggregation'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/aggregation/all', authorization('UNION'), getContainerAggregation)

/**
 * @swagger
 * /container/show/{containerId}:
 *   get:
 *     tags: [Container]
 *     description: Get detailed container information including associated lots, batches, and farmer details
 *     parameters:
 *       - name: containerId
 *         in: path
 *         description: ID of the container to retrieve
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved container details
 *         schema:
 *           $ref: '#/definitions/Container'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Container not found
 *       500:
 *         description: Internal server error
 */
router.get('/show/:containerId', authorization('UNION'), getContainerDetail)

/**
 * @swagger
 * /container/new:
 *   post:
 *     tags: [Container]
 *     description: Create a new container with associated lots
 *     parameters:
 *       - name: body
 *         in: body
 *         description: Container data with lots
 *         required: true
 *         schema:
 *           type: object
 *           required: [containerData, usedLots]
 *           properties:
 *             containerData:
 *               type: object
 *               properties:
 *                 containerName: { type: string }
 *                 type: { type: string }
 *                 unionCode: { type: number }
 *                 quantity: { type: number }
 *             usedLots:
 *               type: array
 *               description: Array of lots to be used in container
 *     responses:
 *       201:
 *         description: Container successfully created
 *         schema:
 *           $ref: '#/definitions/Container'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/new', authorizationForChangeRequest(), createContainer)

/**
 * @swagger
 * /container/{containerId}:
 *   put:
 *     tags: [Container]
 *     description: Update container information
 *     parameters:
 *       - name: containerId
 *         in: path
 *         description: ID of container to update
 *         required: true
 *         type: string
 *       - name: body
 *         in: body
 *         description: Updated container data
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             containerName: { type: string }
 *             containerStatus: { type: string }
 *     responses:
 *       200:
 *         description: Container successfully updated
 *         schema:
 *           $ref: '#/definitions/Container'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Container not found
 *       500:
 *         description: Internal server error
 */
router.put('/:containerId', authorizationForChangeRequest(), updateContainer)

/**
 * @swagger
 * /container/lots:
 *   get:
 *     tags: [Container]
 *     description: Get lots associated with containers
 *     parameters:
 *       - name: containerIds
 *         in: query
 *         description: Array of container IDs
 *         required: true
 *         type: array
 *         items:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved container lots
 *         schema:
 *           $ref: '#/definitions/ContainerLots'
 *       400:
 *         description: Container IDs are required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/lots', authorization('UNION'), getContainerLots)

module.exports = router
