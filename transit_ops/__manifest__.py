{
    'name': 'TransitOps — Smart Transport Operations Platform',
    'version': '17.0.1.0.0',
    'summary': 'Digitize fleet operations: vehicle registry, driver management, trip dispatching, maintenance, fuel/expense tracking, and analytics',
    'description': """
TransitOps — Smart Transport Operations Platform
=================================================
A comprehensive custom module designed to manage fleet assets, drivers, trips, 
maintenance cycles, fuel logs, and expenses. Includes role-based access controls 
and real-time operations dashboards.
    """,
    'author': 'Odoo Hackathon Team',
    'website': 'https://github.com/udaymakhija07-bot/TransitOps',
    'category': 'Operations/Fleet',
    'depends': [
        'base',
        'mail',
    ],
    'data': [
        'security/security_groups.xml',
        'security/ir.model.access.csv',
        'security/record_rules.xml',
        'data/mail_template_data.xml',
        'data/sequence_data.xml',
        'data/ir_cron_data.xml',
        'views/vehicle_views.xml',
        'views/driver_views.xml',
        'views/trip_views.xml',
        'views/maintenance_views.xml',
        'views/fuel_expense_views.xml',
        'views/dashboard_views.xml',
        'views/menu_views.xml',
    ],
    'demo': [
        'data/demo_data.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
