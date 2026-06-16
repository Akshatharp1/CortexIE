// Mock data for the CortexIE prototype.
// Represents RealPage products, sandbox environments, templates, users, and metrics.

export const PRODUCTS = [
  { id: 'onesite', name: 'OneSite Property Management', icon: '🏢' },
  { id: 'aim', name: 'AI Revenue Management (AIRM)', icon: '📈' },
  { id: 'leasestar', name: 'LeaseStar Leasing', icon: '🔑' },
  { id: 'vendorcafe', name: 'Vendor Café', icon: '🧾' },
  { id: 'spend', name: 'Spend Management', icon: '💳' },
  { id: 'screening', name: 'Resident Screening', icon: '🛡️' },
]

export const REGIONS = ['eastus2 (Azure)', 'westus3 (Azure)', 'us-central1 (GCP)', 'europe-west4 (GCP)']

// Storage classes available to back a sandbox's persistent volumes.
export const STORAGE_CLASSES = ['powermax', 'ceph-block', 'powerstore']

// Default pipeline version tag used when the user doesn't name a branch.
export const GLOBAL_PIPELINE_VERSION = '1.7.26'

// Product line the sandbox is built for (Loft suite + adjacent products).
export const LOFT_PRODUCTS = [
  'Loft Living',
  'Loft Moving',
  'Loft Payments',
  'Loft Leasing',
  'Marketing Center',
  'UPFM',
  'RPX',
  'Online Leasing',
  'OneSite',
]

const now = new Date('2026-06-15T09:00:00')
const hoursAgo = (h) => new Date(now.getTime() - h * 3600_000).toISOString()

export const TEMPLATES = [
  {
    id: 'tpl-onesite-full',
    name: 'OneSite — Full Stack',
    product: 'onesite',
    description: 'Complete OneSite environment: web UI, API gateway, billing service, and seeded property data.',
    tier: 'Production-like',
    services: ['onesite-web', 'onesite-api', 'billing-svc', 'postgres', 'redis'],
    cpu: 8, memoryGb: 16, storageGb: 80,
    estCostPerDay: 14.2,
    popularity: 92,
    dependencies: ['postgres@15', 'redis@7', 'auth-broker@2.3'],
  },
  {
    id: 'tpl-airm-ml',
    name: 'AIRM — ML Pipeline',
    product: 'aim',
    description: 'Revenue-management model training + inference sandbox with GPU-enabled worker pool.',
    tier: 'Compute-heavy',
    services: ['airm-api', 'model-trainer', 'feature-store', 'postgres', 'mongo'],
    cpu: 16, memoryGb: 64, storageGb: 200,
    estCostPerDay: 38.5,
    popularity: 74,
    dependencies: ['postgres@15', 'mongo@7', 'kafka@3.6', 'pytorch@2.3'],
  },
  {
    id: 'tpl-leasestar-lite',
    name: 'LeaseStar — Lite',
    product: 'leasestar',
    description: 'Lightweight leasing workflow sandbox for UI/QA testing. Minimal footprint.',
    tier: 'Lightweight',
    services: ['leasestar-web', 'leasestar-api', 'postgres'],
    cpu: 4, memoryGb: 8, storageGb: 40,
    estCostPerDay: 6.8,
    popularity: 88,
    dependencies: ['postgres@15', 'auth-broker@2.3'],
  },
  {
    id: 'tpl-vendorcafe-int',
    name: 'Vendor Café — Integration',
    product: 'vendorcafe',
    description: 'Vendor onboarding + invoice integration sandbox with mock payment gateway.',
    tier: 'Integration',
    services: ['vendorcafe-web', 'invoice-svc', 'payment-mock', 'mongo'],
    cpu: 6, memoryGb: 12, storageGb: 60,
    estCostPerDay: 9.9,
    popularity: 61,
    dependencies: ['mongo@7', 'payment-mock@1.4'],
  },
  {
    id: 'tpl-screening-secure',
    name: 'Resident Screening — Secure',
    product: 'screening',
    description: 'Hardened screening sandbox with PII masking and network policies enabled.',
    tier: 'Secure',
    services: ['screening-api', 'pii-vault', 'postgres'],
    cpu: 6, memoryGb: 16, storageGb: 50,
    estCostPerDay: 11.4,
    popularity: 55,
    dependencies: ['postgres@15', 'vault@1.15', 'network-policy@1.0'],
  },
  {
    id: 'tpl-spend-base',
    name: 'Spend Management — Base',
    product: 'spend',
    description: 'Spend analytics sandbox with seeded GL data and reporting service.',
    tier: 'Standard',
    services: ['spend-web', 'spend-api', 'reporting-svc', 'postgres'],
    cpu: 4, memoryGb: 12, storageGb: 60,
    estCostPerDay: 8.1,
    popularity: 47,
    dependencies: ['postgres@15', 'metabase@0.49'],
  },
]

export const ENVIRONMENTS = [
  {
    id: 'env-7a91',
    name: 'onesite-billing-hotfix',
    product: 'onesite',
    template: 'tpl-onesite-full',
    status: 'running',
    health: 98,
    region: 'eastus2 (Azure)',
    owner: 'Priya Nair',
    createdAt: hoursAgo(52),
    cpu: 8, memoryGb: 16,
    cpuUsage: 41, memUsage: 63,
    costPerDay: 14.2,
    drift: false,
    services: [
      { name: 'onesite-web', status: 'healthy' },
      { name: 'onesite-api', status: 'healthy' },
      { name: 'billing-svc', status: 'healthy' },
      { name: 'postgres', status: 'healthy' },
      { name: 'redis', status: 'healthy' },
    ],
  },
  {
    id: 'env-3c08',
    name: 'airm-q3-model-eval',
    product: 'aim',
    template: 'tpl-airm-ml',
    status: 'running',
    health: 86,
    region: 'us-central1 (GCP)',
    owner: 'Marcus Webb',
    createdAt: hoursAgo(20),
    cpu: 16, memoryGb: 64,
    cpuUsage: 78, memUsage: 71,
    costPerDay: 38.5,
    drift: true,
    services: [
      { name: 'airm-api', status: 'healthy' },
      { name: 'model-trainer', status: 'degraded' },
      { name: 'feature-store', status: 'healthy' },
      { name: 'postgres', status: 'healthy' },
      { name: 'mongo', status: 'healthy' },
    ],
  },
  {
    id: 'env-5f22',
    name: 'leasestar-ui-regression',
    product: 'leasestar',
    template: 'tpl-leasestar-lite',
    status: 'running',
    health: 100,
    region: 'westus3 (Azure)',
    owner: 'Akshatha Reddy',
    createdAt: hoursAgo(6),
    cpu: 4, memoryGb: 8,
    cpuUsage: 22, memUsage: 38,
    costPerDay: 6.8,
    drift: false,
    services: [
      { name: 'leasestar-web', status: 'healthy' },
      { name: 'leasestar-api', status: 'healthy' },
      { name: 'postgres', status: 'healthy' },
    ],
  },
  {
    id: 'env-9d14',
    name: 'vendorcafe-invoice-demo',
    product: 'vendorcafe',
    template: 'tpl-vendorcafe-int',
    status: 'provisioning',
    health: 0,
    region: 'eastus2 (Azure)',
    owner: 'Lin Chen',
    createdAt: hoursAgo(0.2),
    cpu: 6, memoryGb: 12,
    cpuUsage: 0, memUsage: 0,
    costPerDay: 9.9,
    drift: false,
    services: [
      { name: 'vendorcafe-web', status: 'pending' },
      { name: 'invoice-svc', status: 'pending' },
      { name: 'payment-mock', status: 'pending' },
      { name: 'mongo', status: 'pending' },
    ],
  },
  {
    id: 'env-2b67',
    name: 'screening-pii-audit',
    product: 'screening',
    template: 'tpl-screening-secure',
    status: 'idle',
    health: 91,
    region: 'europe-west4 (GCP)',
    owner: 'Dev Patel',
    createdAt: hoursAgo(96),
    cpu: 6, memoryGb: 16,
    cpuUsage: 2, memUsage: 18,
    costPerDay: 11.4,
    drift: false,
    services: [
      { name: 'screening-api', status: 'healthy' },
      { name: 'pii-vault', status: 'healthy' },
      { name: 'postgres', status: 'idle' },
    ],
  },
  {
    id: 'env-8e45',
    name: 'spend-reporting-poc',
    product: 'spend',
    template: 'tpl-spend-base',
    status: 'error',
    health: 34,
    region: 'westus3 (Azure)',
    owner: 'Sara Kim',
    createdAt: hoursAgo(40),
    cpu: 4, memoryGb: 12,
    cpuUsage: 12, memUsage: 88,
    costPerDay: 8.1,
    drift: true,
    services: [
      { name: 'spend-web', status: 'healthy' },
      { name: 'spend-api', status: 'unhealthy' },
      { name: 'reporting-svc', status: 'degraded' },
      { name: 'postgres', status: 'healthy' },
    ],
  },
]

export const USERS = [
  { id: 'u1', name: 'Akshatha Reddy', email: 'Akshatha.Reddy@realpage.com', role: 'Platform Admin', team: 'Integrated Environments', envs: 4, status: 'active' },
  { id: 'u2', name: 'Priya Nair', email: 'priya.nair@realpage.com', role: 'Engineer', team: 'OneSite', envs: 3, status: 'active' },
  { id: 'u3', name: 'Marcus Webb', email: 'marcus.webb@realpage.com', role: 'Engineer', team: 'AIRM', envs: 5, status: 'active' },
  { id: 'u4', name: 'Lin Chen', email: 'lin.chen@realpage.com', role: 'QA', team: 'Vendor Café', envs: 2, status: 'active' },
  { id: 'u5', name: 'Dev Patel', email: 'dev.patel@realpage.com', role: 'Engineer', team: 'Screening', envs: 1, status: 'active' },
  { id: 'u6', name: 'Sara Kim', email: 'sara.kim@realpage.com', role: 'Viewer', team: 'Spend', envs: 1, status: 'suspended' },
]

export const ROLES = [
  { name: 'Platform Admin', create: true, deleteEnv: true, manageUsers: true, viewCost: true, approve: true },
  { name: 'Engineer', create: true, deleteEnv: true, manageUsers: false, viewCost: true, approve: false },
  { name: 'QA', create: true, deleteEnv: false, manageUsers: false, viewCost: false, approve: false },
  { name: 'Viewer', create: false, deleteEnv: false, manageUsers: false, viewCost: true, approve: false },
]

// Time-series seed for monitoring charts (last 24 points)
export const buildTimeSeries = (base, variance, points = 24) => {
  const out = []
  let v = base
  for (let i = points - 1; i >= 0; i--) {
    v = Math.max(0, Math.min(100, v + (Math.sin(i) + (i % 3 === 0 ? 1 : -1)) * variance))
    out.push({ t: `${String((24 - i) % 24).padStart(2, '0')}:00`, value: Math.round(v) })
  }
  return out
}

export const PROVISION_STEPS = [
  'Parsing request & resolving dependencies',
  'Generating Terraform plan (IaC)',
  'Provisioning Kubernetes namespace & quotas',
  'Deploying services & sidecars',
  'Applying RBAC & network policies',
  'Seeding data & running health checks',
]
