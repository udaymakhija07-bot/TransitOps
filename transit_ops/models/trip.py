from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class TransitOpsTrip(models.Model):
    _name = 'transitops.trip'
    _description = 'TransitOps Trip'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'id desc'

    name = fields.Char(string='Trip Reference', required=True, copy=False, readonly=True, default=lambda self: _('New'))
    source = fields.Char(string='Source', required=True, tracking=True)
    destination = fields.Char(string='Destination', required=True, tracking=True)
    
    vehicle_id = fields.Many2one('transitops.vehicle', string='Vehicle', required=True, tracking=True,
                                 domain=[('status', '=', 'available')])
    driver_id = fields.Many2one('transitops.driver', string='Driver', required=True, tracking=True,
                                domain=[('status', '=', 'available'), ('license_expiry_date', '>=', fields.Date.context_today)])
    
    cargo_weight = fields.Float(string='Cargo Weight (kg)', required=True, tracking=True)
    planned_distance = fields.Float(string='Planned Distance (km)', tracking=True)
    actual_distance = fields.Float(string='Actual Distance (km)', tracking=True)
    fuel_consumed = fields.Float(string='Fuel Consumed (Liters)', tracking=True)
    
    state = fields.Selection([
        ('draft', 'Draft'),
        ('dispatched', 'Dispatched'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], string='Status', default='draft', required=True, index=True, tracking=True)
    
    dispatch_date = fields.Datetime(string='Dispatch Date', readonly=True)
    completion_date = fields.Datetime(string='Completion Date', readonly=True)
    
    currency_id = fields.Many2one('res.currency', string='Currency', default=lambda self: self.env.company.currency_id)
    fuel_efficiency = fields.Float(string='Fuel Efficiency (km/L)', compute='_compute_fuel_efficiency', store=True)

    # 1. cargo_weight must not exceed vehicle.max_load_capacity — raise ValidationError
    @api.constrains('cargo_weight', 'vehicle_id')
    def _check_cargo_weight(self):
        for record in self:
            if record.vehicle_id and record.cargo_weight > record.vehicle_id.max_load_capacity:
                raise ValidationError(_("Business Rule Violation: Cargo weight (%.2f kg) exceeds vehicle '%s' maximum capacity (%.2f kg).") % (
                    record.cargo_weight, record.vehicle_id.name, record.vehicle_id.max_load_capacity))

    @api.depends('actual_distance', 'fuel_consumed')
    def _compute_fuel_efficiency(self):
        for trip in self:
            if trip.fuel_consumed > 0:
                trip.fuel_efficiency = trip.actual_distance / trip.fuel_consumed
            else:
                trip.fuel_efficiency = 0.0

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('transitops.trip') or _('New')
        return super(TransitOpsTrip, self).create(vals_list)

    # Workflow Actions
    def action_dispatch(self):
        self.ensure_one()
        if self.state != 'draft':
            raise ValidationError(_("Only draft trips can be dispatched."))

        # business rule checks (server side)
        if self.planned_distance <= 0:
            raise ValidationError(_("Planned distance must be greater than 0 to dispatch the trip."))

        # Vehicle status check
        if self.vehicle_id.status in ('in_shop', 'retired'):
            raise ValidationError(_("Vehicle '%s' is currently retired or in shop and cannot be dispatched.") % self.vehicle_id.name)
        if self.vehicle_id.status == 'on_trip':
            raise ValidationError(_("Vehicle '%s' is already assigned to an active trip.") % self.vehicle_id.name)

        # Driver status check
        if self.driver_id.status == 'suspended':
            raise ValidationError(_("Driver '%s' is suspended and cannot be assigned to a trip.") % self.driver_id.name)
        if self.driver_id.status == 'on_trip':
            raise ValidationError(_("Driver '%s' is already assigned to an active trip.") % self.driver_id.name)
        if self.driver_id.license_expiry_date < fields.Date.today():
            raise ValidationError(_("Driver '%s' license has expired (Expiry: %s) and cannot be assigned to a trip.") % (
                self.driver_id.name, self.driver_id.license_expiry_date))

        # Perform status transitions
        self.vehicle_id.status = 'on_trip'
        self.driver_id.status = 'on_trip'
        
        self.write({
            'state': 'dispatched',
            'dispatch_date': fields.Datetime.now()
        })
        return True

    def action_complete(self):
        self.ensure_one()
        if self.state != 'dispatched':
            raise ValidationError(_("Only dispatched trips can be completed."))

        if self.actual_distance <= 0:
            raise ValidationError(_("Please provide a valid actual distance (greater than 0) before completing the trip."))
        if self.fuel_consumed <= 0:
            raise ValidationError(_("Please provide valid fuel consumed (greater than 0) before completing the trip."))

        # Perform status transitions
        self.vehicle_id.status = 'available'
        self.driver_id.status = 'available'
        
        # Update vehicle odometer
        self.vehicle_id.odometer += self.actual_distance

        self.write({
            'state': 'completed',
            'completion_date': fields.Datetime.now()
        })

        # Auto-create fuel log entry
        # Let's assume standard local cost per liter of 1.5 of the company's currency.
        self.env['transitops.fuel.log'].create({
            'vehicle_id': self.vehicle_id.id,
            'trip_id': self.id,
            'liters': self.fuel_consumed,
            'cost': self.fuel_consumed * 1.5,
            'date': fields.Date.today(),
        })
        return True

    def action_cancel(self):
        self.ensure_one()
        if self.state not in ('draft', 'dispatched'):
            raise ValidationError(_("Only draft or dispatched trips can be cancelled."))

        # If it was already dispatched, restore status
        if self.state == 'dispatched':
            self.vehicle_id.status = 'available'
            self.driver_id.status = 'available'

        self.write({
            'state': 'cancelled'
        })
        return True
