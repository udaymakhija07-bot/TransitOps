from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class TransitOpsMaintenance(models.Model):
    _name = 'transitops.maintenance'
    _description = 'TransitOps Maintenance'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    vehicle_id = fields.Many2one('transitops.vehicle', string='Vehicle', required=True, tracking=True)
    maintenance_type = fields.Char(string='Maintenance Type', required=True, tracking=True)
    cost = fields.Monetary(string='Cost', currency_field='currency_id', required=True, tracking=True)
    currency_id = fields.Many2one('res.currency', string='Currency', default=lambda self: self.env.company.currency_id)
    date = fields.Date(string='Date', required=True, default=fields.Date.today, tracking=True)
    status = fields.Selection([
        ('active', 'Active'),
        ('closed', 'Closed')
    ], string='Status', default='active', required=True, tracking=True)
    notes = fields.Text(string='Notes')

    @api.constrains('cost')
    def _check_cost(self):
        for record in self:
            if record.cost < 0.0:
                raise ValidationError(_("Maintenance cost cannot be negative."))

    @api.model_create_multi
    def create(self, vals_list):
        records = super(TransitOpsMaintenance, self).create(vals_list)
        for record in records:
            if record.status == 'active':
                record.vehicle_id.status = 'in_shop'
        return records

    def write(self, vals):
        res = super(TransitOpsMaintenance, self).write(vals)
        if 'status' in vals or 'vehicle_id' in vals:
            for record in self:
                if record.status == 'active':
                    record.vehicle_id.status = 'in_shop'
                elif record.status == 'closed':
                    # Restores status to available unless the vehicle is retired
                    if record.vehicle_id.status == 'retired':
                        continue
                    # Check if there are other active maintenance logs on the vehicle
                    other_active = self.search([
                        ('vehicle_id', '=', record.vehicle_id.id),
                        ('status', '=', 'active'),
                        ('id', '!=', record.id)
                    ])
                    if not other_active:
                        record.vehicle_id.status = 'available'
        return res
