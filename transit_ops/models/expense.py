from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class TransitOpsExpense(models.Model):
    _name = 'transitops.expense'
    _description = 'TransitOps Expense'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    vehicle_id = fields.Many2one('transitops.vehicle', string='Vehicle', required=True, tracking=True)
    expense_type = fields.Selection([
        ('toll', 'Toll'),
        ('other', 'Other')
    ], string='Expense Type', required=True, default='toll', tracking=True)
    amount = fields.Monetary(string='Amount', currency_field='currency_id', required=True, tracking=True)
    currency_id = fields.Many2one('res.currency', string='Currency', default=lambda self: self.env.company.currency_id)
    date = fields.Date(string='Date', required=True, default=fields.Date.today, tracking=True)

    @api.constrains('amount')
    def _check_amount(self):
        for record in self:
            if record.amount < 0.0:
                raise ValidationError(_("Expense amount cannot be negative."))
