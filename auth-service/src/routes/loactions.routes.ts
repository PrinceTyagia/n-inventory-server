import express from 'express';
import { addLocationForOrg, deleteLocationFromOrg, getAllLocationsForOrg, getLocationIdForOrg, updateLocationInOrg } from '../controllers/loactions.controllers';
import { verifyAccessToken } from '../packages/midleware/authMiddleware';

const router = express.Router();
// @ts-ignore
router.post('/org/location',verifyAccessToken, addLocationForOrg); 
// @ts-ignore 
router.get('/org/locations',verifyAccessToken, getAllLocationsForOrg); 
// @ts-ignore 
router.get('/org/locations/:locationId', verifyAccessToken,getLocationIdForOrg); 
// @ts-ignore
router.put('/org/location/:locationId',verifyAccessToken, updateLocationInOrg); 
// @ts-ignore 
router.delete('/org/location/:locationId',verifyAccessToken, deleteLocationFromOrg); 

export default router;