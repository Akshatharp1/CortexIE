// CortexIE AI configuration engine.
//
// Two modes (toggle-able from Settings):
//   1. "rule"   — deterministic, offline. Parses a natural-language request +
//                 form selections into a provisioning plan. Always works, no key.
//   2. "claude" — calls the Claude API (claude-opus-4-8) to generate the plan as
//                 structured JSON. Requires an API key entered in Settings.
//
// Both return the same plan shape so the UI is agnostic to which engine ran.

import { TEMPLATES, PRODUCTS, PROVISION_STEPS } from '../data/mockData.js'

// ---- shared plan shape -----------------------------------------------------
// {
//   product, template, services[], dependencies[], cpu, memoryGb, storageGb,
//   region, estCostPerDay, securityNotes[], steps[], rationale, source
// }

const KEYWORDS = {
  onesite: ['onesite', 'property', 'billing', 'resident', 'lease ledger'],
  aim: ['airm', 'revenue', 'pricing', 'ml', 'model', 'forecast', 'ai revenue'],
  leasestar: ['leasestar', 'leasing', 'lease', 'tour', 'application'],
  vendorcafe: ['vendor', 'invoice', 'payment', 'procurement', 'vendorcafe'],
  spend: ['spend', 'gl', 'general ledger', 'reporting', 'analytics', 'finance'],
  screening: ['screening', 'pii', 'background', 'credit check', 'security'],
}

const SIZE_HINTS = [
  { re: /\b(large|prod|production|full|heavy|load|scale|gpu)\b/i, mult: 1.6, tier: 'Production-like' },
  { re: /\b(small|lite|minimal|quick|tiny|qa|ui)\b/i, mult: 0.6, tier: 'Lightweight' },
]

function detectProduct(text, fallback) {
  const t = (text || '').toLowerCase()
  let best = null
  let bestScore = 0
  for (const [id, words] of Object.entries(KEYWORDS)) {
    const score = words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0)
    if (score > bestScore) {
      bestScore = score
      best = id
    }
  }
  return best || fallback || 'onesite'
}

function round(n, d = 1) {
  const f = 10 ** d
  return Math.round(n * f) / f
}

// ---- rule-based engine -----------------------------------------------------
export function generatePlanRuleBased({ prompt = '', productId, templateId, region, options = {} }) {
  const product = productId || detectProduct(prompt)
  // Prefer an explicit template, else the most popular template for the product.
  let template =
    TEMPLATES.find((t) => t.id === templateId) ||
    TEMPLATES.filter((t) => t.product === product).sort((a, b) => b.popularity - a.popularity)[0] ||
    TEMPLATES[0]

  let mult = 1
  let tierNote = template.tier
  for (const h of SIZE_HINTS) {
    if (h.re.test(prompt)) {
      mult = h.mult
      tierNote = h.tier
      break
    }
  }

  const services = [...template.services]
  const dependencies = [...template.dependencies]
  const securityNotes = []

  // Option-driven adjustments
  if (options.seedData) services.push('data-seeder')
  if (options.observability) {
    services.push('otel-collector', 'grafana')
    dependencies.push('prometheus@2.5')
  }
  if (options.piiMasking || product === 'screening') {
    securityNotes.push('PII masking enabled via pii-vault sidecar')
    securityNotes.push('Network policies: deny-by-default egress')
    if (!dependencies.includes('vault@1.15')) dependencies.push('vault@1.15')
  }
  if (/\bhipaa|soc2|compliance|audit\b/i.test(prompt)) {
    securityNotes.push('Compliance profile: audit logging + encrypted volumes')
  }

  const cpu = Math.max(2, Math.round(template.cpu * mult))
  const memoryGb = Math.max(4, Math.round(template.memoryGb * mult))
  const storageGb = Math.max(20, Math.round(template.storageGb * mult))
  const estCostPerDay = round(template.estCostPerDay * mult)

  const productName = PRODUCTS.find((p) => p.id === product)?.name || product

  return {
    product,
    productName,
    template: template.id,
    templateName: template.name,
    tier: tierNote,
    services: [...new Set(services)],
    dependencies: [...new Set(dependencies)],
    cpu,
    memoryGb,
    storageGb,
    region: region || 'eastus2 (Azure)',
    estCostPerDay,
    securityNotes,
    steps: PROVISION_STEPS,
    rationale:
      `Detected ${productName} from the request and matched the “${template.name}” blueprint (${tierNote}). ` +
      `Resolved ${dependencies.length} dependencies and sized the environment to ${cpu} vCPU / ${memoryGb} GB. ` +
      `Estimated run cost ≈ $${estCostPerDay}/day.`,
    source: 'Rule-based engine (offline)',
  }
}

// ---- Claude-backed engine --------------------------------------------------
const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    product: { type: 'string' },
    templateName: { type: 'string' },
    tier: { type: 'string' },
    services: { type: 'array', items: { type: 'string' } },
    dependencies: { type: 'array', items: { type: 'string' } },
    cpu: { type: 'integer' },
    memoryGb: { type: 'integer' },
    storageGb: { type: 'integer' },
    estCostPerDay: { type: 'number' },
    securityNotes: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
  required: [
    'product', 'templateName', 'tier', 'services', 'dependencies',
    'cpu', 'memoryGb', 'storageGb', 'estCostPerDay', 'securityNotes', 'rationale',
  ],
}

export async function generatePlanWithClaude({ prompt, productId, templateId, region, apiKey }) {
  // Lazy import keeps the SDK out of the main bundle path when unused.
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const catalog = TEMPLATES.map(
    (t) => `- ${t.name} [product=${t.product}, tier=${t.tier}] services: ${t.services.join(', ')}`,
  ).join('\n')

  const system =
    'You are CortexIE, an environment-orchestration engine for RealPage. ' +
    'Given a sandbox request, produce a concrete, deployment-ready provisioning plan. ' +
    'Prefer the provided blueprint catalog. Keep service names realistic (kebab-case). ' +
    'Costs are USD/day for a cloud sandbox.'

  const user =
    `Blueprint catalog:\n${catalog}\n\n` +
    `Request: ${prompt || '(no free-text; use form selections)'}\n` +
    `Preferred product: ${productId || 'infer'}\n` +
    `Preferred template: ${templateId || 'infer'}\n` +
    `Region: ${region || 'eastus2 (Azure)'}\n\n` +
    'Return the provisioning plan.'

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
  })

  const text = response.content.find((b) => b.type === 'text')?.text || '{}'
  const parsed = JSON.parse(text)

  return {
    ...parsed,
    productName: PRODUCTS.find((p) => p.id === parsed.product)?.name || parsed.product,
    template: templateId || TEMPLATES.find((t) => t.product === parsed.product)?.id || 'tpl-custom',
    region: region || 'eastus2 (Azure)',
    steps: PROVISION_STEPS,
    source: 'Claude API (claude-opus-4-8)',
  }
}

// ---- unified entry point ---------------------------------------------------
export async function generatePlan(req, settings) {
  if (settings?.aiMode === 'claude' && settings?.apiKey) {
    try {
      return await generatePlanWithClaude({ ...req, apiKey: settings.apiKey })
    } catch (err) {
      // Graceful fallback keeps the demo alive if the API call fails.
      const plan = generatePlanRuleBased(req)
      plan.source = `Rule-based fallback (Claude error: ${err?.message || 'unknown'})`
      return plan
    }
  }
  return generatePlanRuleBased(req)
}
