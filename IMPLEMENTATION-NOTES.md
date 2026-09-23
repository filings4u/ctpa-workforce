# CTPA Workforce implementation notes

CTPA Workforce is the parent NON-DOT management portal. Managed Employers are provisioned as Workforce Employer accounts and use the NON-DOT Employer portal. Employees and NON-DOT Drivers are maintained as Workforce worker records.

The package uses the completed C/TPA portal as the UI/feature reference only. Regulated transportation-service concepts are not part of this service.

All C/TPA Workforce frontend requests are routed through `nondot-ctpa-portal`. The portal data surface is `workforce_*` only.
