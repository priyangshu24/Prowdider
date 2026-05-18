import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ServiceRuleType } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const services = [
  { id: 1, slug: "service-1", name: "Service 1" },
  { id: 2, slug: "service-2", name: "Service 2" },
  { id: 3, slug: "service-3", name: "Service 3" },
];

const providers = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Provider ${index + 1}`,
  monthlyQuota: 10,
}));

const rules = [
  { serviceId: 1, providerId: 1, type: ServiceRuleType.MANDATORY, position: 0 },
  { serviceId: 1, providerId: 2, type: ServiceRuleType.FAIR_POOL, position: 0 },
  { serviceId: 1, providerId: 3, type: ServiceRuleType.FAIR_POOL, position: 1 },
  { serviceId: 1, providerId: 4, type: ServiceRuleType.FAIR_POOL, position: 2 },
  { serviceId: 2, providerId: 5, type: ServiceRuleType.MANDATORY, position: 0 },
  { serviceId: 2, providerId: 6, type: ServiceRuleType.FAIR_POOL, position: 0 },
  { serviceId: 2, providerId: 7, type: ServiceRuleType.FAIR_POOL, position: 1 },
  { serviceId: 2, providerId: 8, type: ServiceRuleType.FAIR_POOL, position: 2 },
  { serviceId: 3, providerId: 1, type: ServiceRuleType.MANDATORY, position: 0 },
  { serviceId: 3, providerId: 4, type: ServiceRuleType.MANDATORY, position: 1 },
  { serviceId: 3, providerId: 2, type: ServiceRuleType.FAIR_POOL, position: 0 },
  { serviceId: 3, providerId: 3, type: ServiceRuleType.FAIR_POOL, position: 1 },
  { serviceId: 3, providerId: 5, type: ServiceRuleType.FAIR_POOL, position: 2 },
  { serviceId: 3, providerId: 6, type: ServiceRuleType.FAIR_POOL, position: 3 },
  { serviceId: 3, providerId: 7, type: ServiceRuleType.FAIR_POOL, position: 4 },
  { serviceId: 3, providerId: 8, type: ServiceRuleType.FAIR_POOL, position: 5 },
];

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: service,
      create: service,
    });
  }

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { id: provider.id },
      update: provider,
      create: provider,
    });
  }

  for (const service of services) {
    await prisma.serviceAllocationState.upsert({
      where: { serviceId: service.id },
      update: {},
      create: { serviceId: service.id, cursor: 0 },
    });
  }

  for (const rule of rules) {
    await prisma.serviceRule.upsert({
      where: {
        serviceId_providerId_type: {
          serviceId: rule.serviceId,
          providerId: rule.providerId,
          type: rule.type,
        },
      },
      update: { position: rule.position },
      create: rule,
    });
  }

  let activeCycle = await prisma.quotaCycle.findFirst({ where: { active: true } });

  if (!activeCycle) {
    activeCycle = await prisma.quotaCycle.create({
      data: {
        externalCycleKey: "initial-cycle",
        active: true,
      },
    });
  }

  for (const provider of providers) {
    await prisma.providerQuota.upsert({
      where: {
        providerId_quotaCycleId: {
          providerId: provider.id,
          quotaCycleId: activeCycle.id,
        },
      },
      update: {},
      create: {
        providerId: provider.id,
        quotaCycleId: activeCycle.id,
        assignedCount: 0,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
