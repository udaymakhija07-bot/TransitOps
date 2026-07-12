const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// ==================== DASHBOARD & KPIS ====================
router.get('/dashboard/kpis', async (req, res) => {
  try {
    // Drivers & Safety Officers don't have full dashboard access in Odoo
    if (req.user.role === 'driver' || req.user.role === 'safety') {
      // Just return own stats or restricted stats
      let tripWhere = {};
      if (req.user.role === 'driver') {
        tripWhere = { driver: { name: req.user.name } };
      }
      const recentTrips = await prisma.trip.findMany({
        where: tripWhere,
        take: 10,
        orderBy: { id: 'desc' },
        include: { vehicle: true, driver: true }
      });
      return res.json({
        active_vehicles: 0,
        available_vehicles: 0,
        in_maintenance: 0,
        active_trips: recentTrips.filter(t => t.state === 'dispatched').length,
        pending_trips: recentTrips.filter(t => t.state === 'draft').length,
        drivers_on_duty: 0,
        fleet_utilization: 0,
        recent_trips: recentTrips
      });
    }

    const activeVehiclesCount = await prisma.vehicle.count({
      where: { status: { not: 'retired' } }
    });
    
    const availableVehiclesCount = await prisma.vehicle.count({
      where: { status: 'available' }
    });

    const inMaintenanceCount = await prisma.vehicle.count({
      where: { status: 'in_shop' }
    });

    const activeTripsCount = await prisma.trip.count({
      where: { state: 'dispatched' }
    });

    const pendingTripsCount = await prisma.trip.count({
      where: { state: 'draft' }
    });

    const driversOnDutyCount = await prisma.driver.count({
      where: { status: 'on_trip' }
    });

    const onTripVehiclesCount = await prisma.vehicle.count({
      where: { status: 'on_trip' }
    });

    const utilization = activeVehiclesCount > 0 
      ? (onTripVehiclesCount / activeVehiclesCount) * 100 
      : 0.0;

    const recentTrips = await prisma.trip.findMany({
      take: 10,
      orderBy: { id: 'desc' },
      include: {
        vehicle: true,
        driver: true
      }
    });

    res.json({
      active_vehicles: activeVehiclesCount,
      available_vehicles: availableVehiclesCount,
      in_maintenance: inMaintenanceCount,
      active_trips: activeTripsCount,
      pending_trips: pendingTripsCount,
      drivers_on_duty: driversOnDutyCount,
      fleet_utilization: utilization,
      recent_trips: recentTrips
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
  }
});

// ==================== VEHICLES ====================
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: true,
        maintenanceLogs: true
      }
    });
    
    // Compute operational cost & ROI for each vehicle dynamically
    const computedVehicles = vehicles.map(v => {
      const fuelCost = v.fuelLogs.reduce((sum, log) => sum + log.cost, 0);
      const maintCost = v.maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
      const totalOpCost = fuelCost + maintCost;
      const roi = v.acquisitionCost > 0 
        ? ((v.revenue - totalOpCost) / v.acquisitionCost) * 100 
        : 0;

      // Hide financial details from Drivers and Safety Officers
      const isDriverOrSafety = req.user.role === 'driver' || req.user.role === 'safety';

      return {
        id: v.id,
        name: v.name,
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType,
        maxLoadCapacity: v.maxLoadCapacity,
        odometer: v.odometer,
        status: v.status,
        region: v.region,
        acquisitionCost: isDriverOrSafety ? 0 : v.acquisitionCost,
        revenue: isDriverOrSafety ? 0 : v.revenue,
        total_fuel_cost: isDriverOrSafety ? 0 : fuelCost,
        total_maintenance_cost: isDriverOrSafety ? 0 : maintCost,
        total_operational_cost: isDriverOrSafety ? 0 : totalOpCost,
        roi: isDriverOrSafety ? 0 : roi
      };
    });

    res.json(computedVehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

router.post('/vehicles', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers can register vehicles.' });
    }

    const { name, registrationNumber, vehicleType, maxLoadCapacity, odometer, acquisitionCost, status, region, revenue } = req.body;
    
    if (!name || !registrationNumber || !vehicleType || maxLoadCapacity <= 0) {
      return res.status(400).json({ error: 'Valid Name, Registration Number, Type and Capacity are required.' });
    }

    const duplicate = await prisma.vehicle.findUnique({
      where: { registrationNumber }
    });
    if (duplicate) {
      return res.status(400).json({ error: `Vehicle with registration number '${registrationNumber}' already exists.` });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        registrationNumber,
        vehicleType,
        maxLoadCapacity: parseFloat(maxLoadCapacity),
        odometer: odometer ? parseFloat(odometer) : 0,
        acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : 0,
        status: status || 'available',
        region,
        revenue: revenue ? parseFloat(revenue) : 0
      }
    });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle.' });
  }
});

router.delete('/vehicles/:id', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers can delete vehicles.' });
    }

    const id = parseInt(req.params.id);
    const trips = await prisma.trip.findFirst({
      where: { vehicleId: id }
    });
    if (trips) {
      return res.status(400).json({ error: 'Cannot delete vehicle because it has historical trips associated with it.' });
    }

    await prisma.vehicle.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

// ==================== DRIVERS ====================
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany();
    // Hide safety score from Driver role
    const processed = drivers.map(d => ({
      ...d,
      safetyScore: req.user.role === 'driver' ? null : d.safetyScore
    }));
    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

router.post('/drivers', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager' && req.user.role !== 'safety') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers or Safety Officers can manage drivers.' });
    }

    const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status } = req.body;
    
    if (!name || !licenseNumber || !licenseExpiryDate) {
      return res.status(400).json({ error: 'Name, License Number, and License Expiry Date are required.' });
    }

    const duplicate = await prisma.driver.findUnique({
      where: { licenseNumber }
    });
    if (duplicate) {
      return res.status(400).json({ error: `Driver with license number '${licenseNumber}' already exists.` });
    }

    const score = safetyScore ? parseFloat(safetyScore) : 100.0;
    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Safety score must be between 0 and 100.' });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiryDate: new Date(licenseExpiryDate),
        contactNumber,
        safetyScore: score,
        status: status || 'available'
      }
    });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create driver.' });
  }
});

router.delete('/drivers/:id', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager' && req.user.role !== 'safety') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers or Safety Officers can delete drivers.' });
    }

    const id = parseInt(req.params.id);
    const trips = await prisma.trip.findFirst({
      where: { driverId: id }
    });
    if (trips) {
      return res.status(400).json({ error: 'Cannot delete driver because they have historical trips associated with them.' });
    }

    await prisma.driver.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete driver.' });
  }
});

// ==================== TRIPS ====================
router.get('/trips', async (req, res) => {
  try {
    let whereClause = {};
    // Driver sees only trips where driver name matches user name
    if (req.user.role === 'driver') {
      whereClause = {
        driver: {
          name: req.user.name
        }
      };
    }

    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        driver: true
      },
      orderBy: { id: 'desc' }
    });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips.' });
  }
});

router.post('/trips', async (req, res) => {
  try {
    // Safety officers & Analysts cannot schedule trips
    if (req.user.role === 'safety' || req.user.role === 'analyst') {
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to plan trips.' });
    }

    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = req.body;
    
    if (!source || !destination || !vehicleId || !driverId || cargoWeight <= 0) {
      return res.status(400).json({ error: 'Valid source, destination, vehicle, driver, and cargo weight are required.' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
    const driver = await prisma.driver.findUnique({ where: { id: parseInt(driverId) } });

    if (!vehicle || !driver) {
      return res.status(404).json({ error: 'Selected vehicle or driver not found.' });
    }

    // Business Rule Check: Cargo weight limit
    if (cargoWeight > vehicle.maxLoadCapacity) {
      return res.status(400).json({ error: `Business Rule Violation: Cargo weight (${cargoWeight} kg) exceeds vehicle maximum capacity (${vehicle.maxLoadCapacity} kg).` });
    }

    // Generate unique Trip Reference e.g. TRIP-XXXXX
    const count = await prisma.trip.count();
    const tripName = `TRIP-${String(count + 1).padStart(5, '0')}`;

    const trip = await prisma.trip.create({
      data: {
        name: tripName,
        source,
        destination,
        vehicleId: parseInt(vehicleId),
        driverId: parseInt(driverId),
        cargoWeight: parseFloat(cargoWeight),
        plannedDistance: plannedDistance ? parseFloat(plannedDistance) : 0,
        state: 'draft'
      }
    });
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trip.' });
  }
});

// Dispatch Trip
router.post('/trips/:id/dispatch', async (req, res) => {
  try {
    // Only Fleet Managers and Drivers can dispatch trips
    if (req.user.role !== 'manager' && req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to dispatch trips.' });
    }

    const id = parseInt(req.params.id);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true, driver: true }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }
    if (trip.state !== 'draft') {
      return res.status(400).json({ error: 'Only draft trips can be dispatched.' });
    }

    // If driver, check that this is their own trip
    if (req.user.role === 'driver' && trip.driver.name !== req.user.name) {
      return res.status(403).json({ error: 'Access Denied: Drivers can only dispatch their own assigned trips.' });
    }

    if (trip.plannedDistance <= 0) {
      return res.status(400).json({ error: 'Planned distance must be greater than 0 to dispatch a trip.' });
    }

    // Business Rule: Vehicle checks
    if (trip.vehicle.status === 'in_shop' || trip.vehicle.status === 'retired') {
      return res.status(400).json({ error: `Vehicle '${trip.vehicle.name}' is retired or in shop and cannot be dispatched.` });
    }
    if (trip.vehicle.status === 'on_trip') {
      return res.status(400).json({ error: `Vehicle '${trip.vehicle.name}' is already assigned to an active trip.` });
    }

    // Business Rule: Driver checks
    if (trip.driver.status === 'suspended') {
      return res.status(400).json({ error: `Driver '${trip.driver.name}' is suspended and cannot be dispatched.` });
    }
    if (trip.driver.status === 'on_trip') {
      return res.status(400).json({ error: `Driver '${trip.driver.name}' is already assigned to an active trip.` });
    }
    if (new Date(trip.driver.licenseExpiryDate) < new Date()) {
      return res.status(400).json({ error: `Driver '${trip.driver.name}' license has expired.` });
    }

    // Perform transitions
    await prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'on_trip' }
    });

    await prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: 'on_trip' }
    });

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        state: 'dispatched',
        dispatchDate: new Date()
      }
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispatch trip.' });
  }
});

// Complete Trip
router.post('/trips/:id/complete', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to complete trips.' });
    }

    const id = parseInt(req.params.id);
    const { actualDistance, fuelConsumed } = req.body;

    if (!actualDistance || actualDistance <= 0 || !fuelConsumed || fuelConsumed <= 0) {
      return res.status(400).json({ error: 'Valid actual distance and fuel consumed are required to complete a trip.' });
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true, driver: true }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }
    if (trip.state !== 'dispatched') {
      return res.status(400).json({ error: 'Only dispatched trips can be completed.' });
    }

    // If driver, check that this is their own trip
    if (req.user.role === 'driver' && trip.driver.name !== req.user.name) {
      return res.status(403).json({ error: 'Access Denied: Drivers can only complete their own assigned trips.' });
    }

    // Restore vehicle and driver to available
    await prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        status: 'available',
        odometer: trip.vehicle.odometer + parseFloat(actualDistance)
      }
    });

    await prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: 'available' }
    });

    // Update trip details
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        state: 'completed',
        actualDistance: parseFloat(actualDistance),
        fuelConsumed: parseFloat(fuelConsumed),
        completionDate: new Date()
      }
    });

    // Auto-create fuel log
    await prisma.fuelLog.create({
      data: {
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        liters: parseFloat(fuelConsumed),
        cost: parseFloat(fuelConsumed) * 1.5,
        date: new Date()
      }
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete trip.' });
  }
});

// Cancel Trip
router.post('/trips/:id/cancel', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to cancel trips.' });
    }

    const id = parseInt(req.params.id);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { driver: true }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }
    if (trip.state !== 'draft' && trip.state !== 'dispatched') {
      return res.status(400).json({ error: 'Only draft or dispatched trips can be cancelled.' });
    }

    // If driver, check that this is their own trip
    if (req.user.role === 'driver' && trip.driver.name !== req.user.name) {
      return res.status(403).json({ error: 'Access Denied: Drivers can only cancel their own assigned trips.' });
    }

    if (trip.state === 'dispatched') {
      // Revert vehicle & driver status
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' }
      });
      await prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' }
      });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { state: 'cancelled' }
    });

    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel trip.' });
  }
});

// ==================== MAINTENANCE ====================
router.get('/maintenance', async (req, res) => {
  try {
    const logs = await prisma.maintenance.findMany({
      include: { vehicle: true }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance logs.' });
  }
});

router.post('/maintenance', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers or Financial Analysts can schedule maintenance.' });
    }

    const { vehicleId, maintenanceType, cost, date, status, notes } = req.body;
    if (!vehicleId || !maintenanceType || cost < 0 || !date) {
      return res.status(400).json({ error: 'Valid Vehicle, Type, non-negative Cost, and Date are required.' });
    }

    const maint = await prisma.maintenance.create({
      data: {
        vehicleId: parseInt(vehicleId),
        maintenanceType,
        cost: parseFloat(cost),
        date: new Date(date),
        status: status || 'active',
        notes
      }
    });

    // If active, flip vehicle status to in_shop
    if (status === 'active') {
      await prisma.vehicle.update({
        where: { id: parseInt(vehicleId) },
        data: { status: 'in_shop' }
      });
    }

    res.json(maint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance log.' });
  }
});

router.put('/maintenance/:id', async (req, res) => {
  try {
    // RBAC check
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Only Fleet Managers or Financial Analysts can update maintenance logs.' });
    }

    const id = parseInt(req.params.id);
    const { status } = req.body;

    const maint = await prisma.maintenance.findUnique({ where: { id } });
    if (!maint) {
      return res.status(404).json({ error: 'Log not found.' });
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: { status }
    });

    if (status === 'closed') {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: maint.vehicleId } });
      if (vehicle.status !== 'retired') {
        // Verify no other active maintenance
        const activeMaint = await prisma.maintenance.count({
          where: {
            vehicleId: maint.vehicleId,
            status: 'active',
            id: { not: id }
          }
        });
        if (activeMaint === 0) {
          await prisma.vehicle.update({
            where: { id: maint.vehicleId },
            data: { status: 'available' }
          });
        }
      }
    } else if (status === 'active') {
      await prisma.vehicle.update({
        where: { id: maint.vehicleId },
        data: { status: 'in_shop' }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance.' });
  }
});

// ==================== FUEL LOGS ====================
router.get('/fuel-logs', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Financial access restricted.' });
    }

    const logs = await prisma.fuelLog.findMany({
      include: { vehicle: true }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fuel logs.' });
  }
});

router.post('/fuel-logs', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Financial access restricted.' });
    }

    const { vehicleId, tripId, liters, cost, date } = req.body;
    if (!vehicleId || liters <= 0 || cost <= 0 || !date) {
      return res.status(400).json({ error: 'Valid Vehicle, Liters, Cost, and Date are required.' });
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: parseInt(vehicleId),
        tripId: tripId ? parseInt(tripId) : null,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        date: new Date(date)
      }
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log fuel.' });
  }
});

// ==================== EXPENSES ====================
router.get('/expenses', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Financial access restricted.' });
    }

    const list = await prisma.expense.findMany({
      include: { vehicle: true }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({ error: 'Access Denied: Financial access restricted.' });
    }

    const { vehicleId, expenseType, amount, date } = req.body;
    if (!vehicleId || !expenseType || amount <= 0 || !date) {
      return res.status(400).json({ error: 'Valid Vehicle, Type, Amount, and Date are required.' });
    }

    const exp = await prisma.expense.create({
      data: {
        vehicleId: parseInt(vehicleId),
        expenseType,
        amount: parseFloat(amount),
        date: new Date(date)
      }
    });
    res.json(exp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense.' });
  }
});

module.exports = router;
