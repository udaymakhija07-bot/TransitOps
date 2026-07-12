const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned old records.');

  // Create Users with different roles (Password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await prisma.user.create({
    data: {
      email: 'manager@transitops.com',
      password: passwordHash,
      role: 'manager',
      name: 'Fleet Manager'
    }
  });

  await prisma.user.create({
    data: {
      email: 'driver@transitops.com',
      password: passwordHash,
      role: 'driver',
      name: 'Amit Singh'
    }
  });

  await prisma.user.create({
    data: {
      email: 'safety@transitops.com',
      password: passwordHash,
      role: 'safety',
      name: 'Safety Officer'
    }
  });

  await prisma.user.create({
    data: {
      email: 'analyst@transitops.com',
      password: passwordHash,
      role: 'analyst',
      name: 'Financial Analyst'
    }
  });

  console.log('User accounts seeded.');

  // Create Vehicles
  const v1 = await prisma.vehicle.create({
    data: {
      name: 'Volvo FH16 Heavy Truck',
      registrationNumber: 'MH-12-TR-9991',
      vehicleType: 'truck',
      maxLoadCapacity: 25000,
      odometer: 45200.0,
      acquisitionCost: 120000.0,
      status: 'available',
      region: 'West Region',
      revenue: 15000.0,
    }
  });

  const v2 = await prisma.vehicle.create({
    data: {
      name: 'Ford Transit Delivery Van',
      registrationNumber: 'MH-12-TR-9992',
      vehicleType: 'van',
      maxLoadCapacity: 3500,
      odometer: 12800.0,
      acquisitionCost: 35000.0,
      status: 'available',
      region: 'North Region',
      revenue: 4200.0,
    }
  });

  const v3 = await prisma.vehicle.create({
    data: {
      name: 'Mercedes Benz Sprinter',
      registrationNumber: 'MH-12-TR-9993',
      vehicleType: 'van',
      maxLoadCapacity: 4000,
      odometer: 8520.0,
      acquisitionCost: 42000.0,
      status: 'on_trip',
      region: 'East Region',
      revenue: 800.0,
    }
  });

  const v4 = await prisma.vehicle.create({
    data: {
      name: 'Scania R500 Hauler',
      registrationNumber: 'MH-12-TR-9994',
      vehicleType: 'truck',
      maxLoadCapacity: 30000,
      odometer: 95400.0,
      acquisitionCost: 145000.0,
      status: 'in_shop',
      region: 'South Region',
      revenue: 0.0,
    }
  });

  const v5 = await prisma.vehicle.create({
    data: {
      name: 'Suzuki Super Carry',
      registrationNumber: 'MH-12-TR-9995',
      vehicleType: 'van',
      maxLoadCapacity: 1200,
      odometer: 65800.0,
      acquisitionCost: 12000.0,
      status: 'retired',
      region: 'West Region',
      revenue: 0.0,
    }
  });

  const v6 = await prisma.vehicle.create({
    data: {
      name: 'Yamaha Crux Cargo Bike',
      registrationNumber: 'MH-12-TR-9996',
      vehicleType: 'bike',
      maxLoadCapacity: 250,
      odometer: 2450.0,
      acquisitionCost: 2200.0,
      status: 'available',
      region: 'City Center',
      revenue: 450.0,
    }
  });

  // Create Drivers
  const d1 = await prisma.driver.create({
    data: {
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-1420190001',
      licenseCategory: 'Heavy Commercial (HCV)',
      licenseExpiryDate: new Date(Date.now() + 1000*60*60*24*365*2), // 2 years
      contactNumber: '+91 98765 43210',
      safetyScore: 94.5,
      status: 'available',
    }
  });

  const d2 = await prisma.driver.create({
    data: {
      name: 'Amit Singh',
      licenseNumber: 'DL-1420190002',
      licenseCategory: 'Light Commercial (LCV)',
      licenseExpiryDate: new Date(Date.now() + 1000*60*60*24*365), // 1 year
      contactNumber: '+91 98765 43211',
      safetyScore: 88.0,
      status: 'on_trip',
    }
  });

  const d3 = await prisma.driver.create({
    data: {
      name: 'John Miller (Expiring License)',
      licenseNumber: 'DL-1420190003',
      licenseCategory: 'Commercial Vehicle',
      licenseExpiryDate: new Date(Date.now() + 1000*60*60*24*10), // 10 days
      contactNumber: '+91 98765 43212',
      safetyScore: 92.0,
      status: 'available',
    }
  });

  const d4 = await prisma.driver.create({
    data: {
      name: 'Devendra Patil (Suspended)',
      licenseNumber: 'DL-1420190004',
      licenseCategory: 'Heavy Transport',
      licenseExpiryDate: new Date(Date.now() + 1000*60*60*24*365*3), // 3 years
      contactNumber: '+91 98765 43213',
      safetyScore: 45.0,
      status: 'suspended',
    }
  });

  const d5 = await prisma.driver.create({
    data: {
      name: 'Vikram Rathore',
      licenseNumber: 'DL-1420190005',
      licenseCategory: 'Light Motor Vehicle',
      licenseExpiryDate: new Date(Date.now() + 1000*60*60*24*180), // 6 months
      contactNumber: '+91 98765 43214',
      safetyScore: 99.0,
      status: 'off_duty',
    }
  });

  // Create Trips
  const tCompleted = await prisma.trip.create({
    data: {
      name: 'TRIP-00001',
      source: 'Mumbai Warehouse',
      destination: 'Pune Distribution Center',
      vehicleId: v1.id,
      driverId: d1.id,
      cargoWeight: 12000.0,
      plannedDistance: 150.0,
      actualDistance: 152.0,
      fuelConsumed: 38.0,
      state: 'completed',
      dispatchDate: new Date(Date.now() - 1000*60*60*24*2),
      completionDate: new Date(Date.now() - 1000*60*60*24*2 + 1000*60*60*4),
    }
  });

  const tDispatched = await prisma.trip.create({
    data: {
      name: 'TRIP-00002',
      source: 'East Warehouse',
      destination: 'Kolkata Hub',
      vehicleId: v3.id,
      driverId: d2.id,
      cargoWeight: 2200.0,
      plannedDistance: 350.0,
      state: 'dispatched',
      dispatchDate: new Date(),
    }
  });

  const tDraft = await prisma.trip.create({
    data: {
      name: 'TRIP-00003',
      source: 'City Distribution',
      destination: 'Local Stores',
      vehicleId: v6.id,
      driverId: d3.id,
      cargoWeight: 180.0,
      plannedDistance: 25.0,
      state: 'draft',
    }
  });

  const tCancelled = await prisma.trip.create({
    data: {
      name: 'TRIP-00004',
      source: 'North Warehouse',
      destination: 'Delhi Terminal',
      vehicleId: v2.id,
      driverId: d5.id,
      cargoWeight: 2900.0,
      plannedDistance: 180.0,
      state: 'cancelled',
    }
  });

  // Create Maintenance
  await prisma.maintenance.create({
    data: {
      vehicleId: v4.id,
      maintenanceType: 'Engine Overhaul & Brake replacement',
      cost: 4500.0,
      date: new Date(),
      status: 'active',
      notes: 'Severe engine knock reported. Replacing cylinder head seals and brake pads.',
    }
  });

  // Create Fuel Logs
  await prisma.fuelLog.create({
    data: {
      vehicleId: v1.id,
      tripId: tCompleted.id,
      liters: 38.0,
      cost: 57.0,
      date: new Date(Date.now() - 1000*60*60*24*2),
    }
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: v2.id,
      liters: 45.0,
      cost: 67.5,
      date: new Date(),
    }
  });

  // Create Expenses
  await prisma.expense.create({
    data: {
      vehicleId: v1.id,
      expenseType: 'toll',
      amount: 25.0,
      date: new Date(Date.now() - 1000*60*60*24*2),
    }
  });

  await prisma.expense.create({
    data: {
      vehicleId: v3.id,
      expenseType: 'other',
      amount: 15.0,
      date: new Date(),
    }
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
