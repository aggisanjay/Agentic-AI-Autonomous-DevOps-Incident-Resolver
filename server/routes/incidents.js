const express = require('express');
const { createIncident, listIncidents, getIncident } = require('../controllers/incidentController');

const router = express.Router();

router.post('/', createIncident);
router.get('/', listIncidents);
router.get('/:id', getIncident);

module.exports = router;
