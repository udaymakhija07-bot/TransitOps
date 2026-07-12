from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

class TransitOpsDriver(models.Model):
    _name = 'transitops.driver'
    _description = 'TransitOps Driver'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Driver Name', required=True, tracking=True)
    license_number = fields.Char(string='License Number', required=True, index=True, tracking=True)
    license_category = fields.Char(string='License Category', tracking=True)
    license_expiry_date = fields.Date(string='License Expiry Date', required=True, tracking=True)
    contact_number = fields.Char(string='Contact Number', tracking=True)
    safety_score = fields.Float(string='Safety Score (0-100)', default=100.0, tracking=True)
    status = fields.Selection([
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('off_duty', 'Off Duty'),
        ('suspended', 'Suspended')
    ], string='Status', default='available', required=True, tracking=True)
    user_id = fields.Many2one('res.users', string='Related User', help="User login associated with this driver for self-service portal rules.", tracking=True)

    # SQL Constraints
    _sql_constraints = [
        ('license_number_unique', 'unique(license_number)', 'The driver license number must be unique!')
    ]

    # Friendly constraint validation for duplicate license number
    @api.constrains('license_number')
    def _check_license_number_unique(self):
        for record in self:
            duplicate = self.search([
                ('license_number', '=', record.license_number),
                ('id', '!=', record.id)
            ])
            if duplicate:
                raise ValidationError(_("A driver with license number '%s' already exists.") % record.license_number)

    @api.constrains('safety_score')
    def _check_safety_score(self):
        for record in self:
            if record.safety_score < 0.0 or record.safety_score > 100.0:
                raise ValidationError(_("Safety score must be between 0 and 100."))

    def unlink(self):
        for driver in self:
            trips = self.env['transitops.trip'].search([('driver_id', '=', driver.id)])
            if trips:
                raise UserError(_("Cannot delete driver '%s' because they have historical trips associated with them.") % driver.name)
        return super(TransitOpsDriver, self).unlink()

    @api.model
    def check_license_expiry(self):
        today = fields.Date.today()
        alert_date = fields.Date.add(today, days=15)
        drivers = self.search([
            ('license_expiry_date', '<=', alert_date),
            ('license_expiry_date', '>=', today)
        ])
        if not drivers:
            return
        
        # Get Safety Officer group users
        safety_group = self.env.ref('transit_ops.group_transitops_safety_officer')
        safety_officers = safety_group.users
        if not safety_officers:
            safety_officers = self.env.ref('base.group_system').users

        activity_type = self.env.ref('mail.mail_activity_data_todo')

        for driver in drivers:
            # Check if there is already an active activity for this driver regarding license renewal
            existing = self.env['mail.activity'].search([
                ('res_model', '=', 'transitops.driver'),
                ('res_id', '=', driver.id),
                ('activity_type_id', '=', activity_type.id),
                ('summary', '=', 'License Expiry Alert')
            ])
            if existing:
                continue

            for officer in safety_officers:
                self.env['mail.activity'].create({
                    'res_model_id': self.env['ir.model']._get('transitops.driver').id,
                    'res_id': driver.id,
                    'activity_type_id': activity_type.id,
                    'summary': 'License Expiry Alert',
                    'note': _("Driver %s's license is expiring on %s. Please review compliance.") % (driver.name, driver.license_expiry_date),
                    'date_deadline': driver.license_expiry_date,
                    'user_id': officer.id,
                })

