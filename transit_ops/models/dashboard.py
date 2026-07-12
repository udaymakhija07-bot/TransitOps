from odoo import models, fields, api, _

class TransitOpsDashboard(models.Model):
    _name = 'transitops.dashboard'
    _description = 'TransitOps Dynamic Dashboard'

    name = fields.Char(string='Title', default='TransitOps Dashboard')
    active_vehicles = fields.Integer(string='Active Vehicles', compute='_compute_stats')
    available_vehicles = fields.Integer(string='Available Vehicles', compute='_compute_stats')
    in_maintenance = fields.Integer(string='Vehicles in Maintenance', compute='_compute_stats')
    active_trips = fields.Integer(string='Active Trips', compute='_compute_stats')
    pending_trips = fields.Integer(string='Pending Trips', compute='_compute_stats')
    drivers_on_duty = fields.Integer(string='Drivers On Duty', compute='_compute_stats')
    fleet_utilization = fields.Float(string='Fleet Utilization (%)', compute='_compute_stats')
    
    recent_trip_ids = fields.Many2many('transitops.trip', string='Recent Trips', compute='_compute_stats')

    def _compute_stats(self):
        Vehicle = self.env['transitops.vehicle']
        Trip = self.env['transitops.trip']
        Driver = self.env['transitops.driver']

        active_veh_count = Vehicle.search_count([('status', '!=', 'retired')])
        on_trip_veh_count = Vehicle.search_count([('status', '=', 'on_trip')])
        utilization = (on_trip_veh_count / active_veh_count * 100.0) if active_veh_count > 0 else 0.0

        # Last 10 trips
        recent_trips = Trip.search([], limit=10, order='id desc')

        for dashboard in self:
            dashboard.active_vehicles = active_veh_count
            dashboard.available_vehicles = Vehicle.search_count([('status', '=', 'available')])
            dashboard.in_maintenance = Vehicle.search_count([('status', '=', 'in_shop')])
            dashboard.active_trips = Trip.search_count([('state', '=', 'dispatched')])
            dashboard.pending_trips = Trip.search_count([('state', '=', 'draft')])
            dashboard.drivers_on_duty = Driver.search_count([('status', '=', 'on_trip')])
            dashboard.fleet_utilization = utilization
            dashboard.recent_trip_ids = [(6, 0, recent_trips.ids)]

    @api.model
    def action_open_dashboard(self):
        dashboard = self.search([], limit=1)
        if not dashboard:
            dashboard = self.create({'name': 'TransitOps Dashboard'})
        
        return {
            'name': _('TransitOps Dashboard'),
            'type': 'ir.actions.act_window',
            'res_model': 'transitops.dashboard',
            'view_mode': 'form',
            'res_id': dashboard.id,
            'target': 'current',
            'context': {'create': False, 'delete': False, 'edit': False},
        }
