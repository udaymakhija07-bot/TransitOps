from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class TransitOpsFuelLog(models.Model):
    _name = 'transitops.fuel.log'
    _description = 'TransitOps Fuel Log'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    vehicle_id = fields.Many2one('transitops.vehicle', string='Vehicle', required=True, tracking=True)
    trip_id = fields.Many2one('transitops.trip', string='Trip', optional=True, tracking=True)
    liters = fields.Float(string='Liters', required=True, tracking=True)
    cost = fields.Monetary(string='Cost', currency_field='currency_id', required=True, tracking=True)
    currency_id = fields.Many2one('res.currency', string='Currency', default=lambda self: self.env.company.currency_id)
    date = fields.Date(string='Date', required=True, default=fields.Date.today, tracking=True)

    @api.constrains('liters', 'cost')
    def _check_liters_cost(self):
        for record in self:
            if record.liters < 0.0:
                raise ValidationError(_("Fuel liters cannot be negative."))
            if record.cost < 0.0:
                raise ValidationError(_("Fuel cost cannot be negative."))
