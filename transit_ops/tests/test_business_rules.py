from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError
from odoo import fields
from datetime import timedelta

class TestTransitOps(TransactionCase):

    def setUp(self):
        super(TestTransitOps, self).setUp()
        # Initialize test data
        self.vehicle = self.env['transitops.vehicle'].create({
            'name': 'Test Cargo Van',
            'registration_number': 'TEST-REG-001',
            'vehicle_type': 'van',
            'max_load_capacity': 1000.0,
            'odometer': 5000.0,
            'acquisition_cost': 25000.0,
        })
        
        self.driver = self.env['transitops.driver'].create({
            'name': 'Test John Doe',
            'license_number': 'TEST-LIC-001',
            'license_category': 'Class A',
            'license_expiry_date': fields.Date.today() + timedelta(days=30),
            'safety_score': 90.0,
        })

    def test_unique_registration_number(self):
        """Test registration_number must be unique (SQL constraint & Python constraint)."""
        with self.assertRaises(ValidationError):
            self.env['transitops.vehicle'].create({
                'name': 'Another Van',
                'registration_number': 'TEST-REG-001',
                'vehicle_type': 'van',
                'max_load_capacity': 500.0,
            })

    def test_cargo_weight_limit(self):
        """Test cargo_weight must not exceed vehicle max_load_capacity."""
        with self.assertRaises(ValidationError):
            self.env['transitops.trip'].create({
                'source': 'Point A',
                'destination': 'Point B',
                'vehicle_id': self.vehicle.id,
                'driver_id': self.driver.id,
                'cargo_weight': 1500.0,  # exceeds 1000.0
                'planned_distance': 100.0,
            })

    def test_trip_dispatch_lifecycle(self):
        """Test trip dispatch, completion, status updates, and auto fuel log creation."""
        trip = self.env['transitops.trip'].create({
            'source': 'Point A',
            'destination': 'Point B',
            'vehicle_id': self.vehicle.id,
            'driver_id': self.driver.id,
            'cargo_weight': 800.0,
            'planned_distance': 100.0,
        })
        self.assertEqual(trip.state, 'draft')
        self.assertEqual(self.vehicle.status, 'available')
        self.assertEqual(self.driver.status, 'available')

        # Dispatch
        trip.action_dispatch()
        self.assertEqual(trip.state, 'dispatched')
        self.assertEqual(self.vehicle.status, 'on_trip')
        self.assertEqual(self.driver.status, 'on_trip')

        # Completing requires actual_distance and fuel_consumed to be filled
        with self.assertRaises(ValidationError):
            trip.action_complete()

        # Set values and complete
        trip.write({
            'actual_distance': 110.0,
            'fuel_consumed': 22.0,
        })
        trip.action_complete()
        
        self.assertEqual(trip.state, 'completed')
        self.assertEqual(self.vehicle.status, 'available')
        self.assertEqual(self.driver.status, 'available')
        self.assertEqual(self.vehicle.odometer, 5110.0)  # 5000 + 110

        # Verify fuel log auto-created
        fuel_logs = self.env['transitops.fuel.log'].search([('trip_id', '=', trip.id)])
        self.assertEqual(len(fuel_logs), 1)
        self.assertEqual(fuel_logs.liters, 22.0)

    def test_maintenance_flow(self):
        """Test creating active maintenance updates vehicle status to 'in_shop' and closing it restores 'available'."""
        maint = self.env['transitops.maintenance'].create({
            'vehicle_id': self.vehicle.id,
            'maintenance_type': 'Oil Change',
            'cost': 150.0,
            'status': 'active',
        })
        self.assertEqual(self.vehicle.status, 'in_shop')

        # Close maintenance
        maint.write({'status': 'closed'})
        self.assertEqual(self.vehicle.status, 'available')
