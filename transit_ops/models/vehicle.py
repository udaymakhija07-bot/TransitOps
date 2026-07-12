from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

class TransitOpsVehicle(models.Model):
    _name = 'transitops.vehicle'
    _description = 'TransitOps Vehicle'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Vehicle Name/Model', required=True, tracking=True)
    registration_number = fields.Char(string='Registration Number', required=True, index=True, tracking=True)
    vehicle_type = fields.Selection([
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('bike', 'Bike'),
        ('other', 'Other')
    ], string='Vehicle Type', required=True, default='van', tracking=True)
    max_load_capacity = fields.Float(string='Max Load Capacity (kg)', required=True, tracking=True)
    odometer = fields.Float(string='Odometer (km)', default=0.0, tracking=True)
    acquisition_cost = fields.Monetary(string='Acquisition Cost', currency_field='currency_id', tracking=True)
    currency_id = fields.Many2one('res.currency', string='Currency', default=lambda self: self.env.company.currency_id)
    status = fields.Selection([
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('in_shop', 'In Shop'),
        ('retired', 'Retired')
    ], string='Status', default='available', index=True, required=True, tracking=True)
    region = fields.Char(string='Region', tracking=True)
    revenue = fields.Monetary(string='Revenue', currency_field='currency_id', default=0.0, tracking=True,
                              help="Assumption: Revenue is manually entered/updated per vehicle to compute ROI.")

    # Relationships
    trip_ids = fields.One2many('transitops.trip', 'vehicle_id', string='Trips')
    fuel_log_ids = fields.One2many('transitops.fuel.log', 'vehicle_id', string='Fuel Logs')
    maintenance_ids = fields.One2many('transitops.maintenance', 'vehicle_id', string='Maintenance Records')
    expense_ids = fields.One2many('transitops.expense', 'vehicle_id', string='Expenses')

    # Computed fields
    total_fuel_cost = fields.Monetary(string='Total Fuel Cost', compute='_compute_costs', currency_field='currency_id', store=True)
    total_maintenance_cost = fields.Monetary(string='Total Maintenance Cost', compute='_compute_costs', currency_field='currency_id', store=True)
    total_operational_cost = fields.Monetary(string='Total Operational Cost', compute='_compute_costs', currency_field='currency_id', store=True)
    roi = fields.Float(string='ROI (%)', compute='_compute_roi', store=True)

    # Smart button counters
    trip_count = fields.Integer(string='Trip Count', compute='_compute_counts')
    fuel_log_count = fields.Integer(string='Fuel Log Count', compute='_compute_counts')
    maintenance_count = fields.Integer(string='Maintenance Count', compute='_compute_counts')

    # SQL Constraints
    _sql_constraints = [
        ('reg_number_unique', 'unique(registration_number)', 'The registration number must be unique!')
    ]

    # Friendly constraint validation for duplicate registration
    @api.constrains('registration_number')
    def _check_registration_number_unique(self):
        for record in self:
            duplicate = self.search([
                ('registration_number', '=', record.registration_number),
                ('id', '!=', record.id)
            ])
            if duplicate:
                raise ValidationError(_("A vehicle with registration number '%s' already exists.") % record.registration_number)

    @api.depends('fuel_log_ids.cost', 'maintenance_ids.cost', 'fuel_log_ids', 'maintenance_ids')
    def _compute_costs(self):
        for vehicle in self:
            fuel_cost = sum(vehicle.fuel_log_ids.mapped('cost'))
            maint_cost = sum(vehicle.maintenance_ids.mapped('cost'))
            vehicle.total_fuel_cost = fuel_cost
            vehicle.total_maintenance_cost = maint_cost
            vehicle.total_operational_cost = fuel_cost + maint_cost

    @api.depends('revenue', 'total_operational_cost', 'acquisition_cost')
    def _compute_roi(self):
        for vehicle in self:
            if vehicle.acquisition_cost > 0.0:
                vehicle.roi = ((vehicle.revenue - vehicle.total_operational_cost) / vehicle.acquisition_cost) * 100
            else:
                vehicle.roi = 0.0

    @api.depends('trip_ids', 'fuel_log_ids', 'maintenance_ids')
    def _compute_counts(self):
        for vehicle in self:
            vehicle.trip_count = len(vehicle.trip_ids)
            vehicle.fuel_log_count = len(vehicle.fuel_log_ids)
            vehicle.maintenance_count = len(vehicle.maintenance_ids)

    @api.constrains('status', 'trip_ids')
    def _check_retired_status(self):
        for vehicle in self:
            if vehicle.status == 'retired':
                active_trips = vehicle.trip_ids.filtered(lambda t: t.state == 'dispatched')
                if active_trips:
                    raise ValidationError(_("Cannot retire vehicle '%s' because it has an active dispatched trip (e.g. %s).") % (vehicle.name, active_trips[0].name))

    def unlink(self):
        for vehicle in self:
            if vehicle.trip_ids:
                raise UserError(_("Cannot delete vehicle '%s' because it has historical trips associated with it.") % vehicle.name)
        return super(TransitOpsVehicle, self).unlink()

    # Smart Button Actions
    def action_view_trips(self):
        self.ensure_one()
        return {
            'name': _('Trips for %s') % self.name,
            'type': 'ir.actions.act_window',
            'res_model': 'transitops.trip',
            'view_mode': 'tree,form',
            'domain': [('vehicle_id', '=', self.id)],
            'context': {'default_vehicle_id': self.id},
        }

    def action_view_fuel_logs(self):
        self.ensure_one()
        return {
            'name': _('Fuel Logs for %s') % self.name,
            'type': 'ir.actions.act_window',
            'res_model': 'transitops.fuel.log',
            'view_mode': 'tree,form',
            'domain': [('vehicle_id', '=', self.id)],
            'context': {'default_vehicle_id': self.id},
        }

    def action_view_maintenance(self):
        self.ensure_one()
        return {
            'name': _('Maintenance for %s') % self.name,
            'type': 'ir.actions.act_window',
            'res_model': 'transitops.maintenance',
            'view_mode': 'tree,form',
            'domain': [('vehicle_id', '=', self.id)],
            'context': {'default_vehicle_id': self.id},
        }
