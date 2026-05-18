import {
  Prisma,
  PrismaClient,
  ServiceRuleType,
  type Lead,
  type LeadAssignment,
  type ProviderQuota,
  type ServiceRule,
} from "@prisma/client";
import { LEAD_ALLOCATION_RETRY_LIMIT, REQUIRED_PROVIDER_COUNT } from "@/lib/constants";
import { AllocationError, DuplicateLeadError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type CreateLeadInput, createLeadSchema, normalizePhoneNumber } from "@/lib/validation";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

type QuotaWithProvider = ProviderQuota & {
  provider: {
    id: number;
    name: string;
    monthlyQuota: number;
  };
};

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function getRemainingQuota(quota: QuotaWithProvider) {
  return quota.provider.monthlyQuota - quota.assignedCount;
}

function hasCapacity(quota: QuotaWithProvider | undefined) {
  return Boolean(quota && getRemainingQuota(quota) > 0);
}

function computeRoundRobinSelection(
  poolRules: ServiceRule[],
  cursor: number,
  remainingSlots: number,
  quotaByProviderId: Map<number, QuotaWithProvider>,
  selectedProviderIds: number[],
) {
  if (poolRules.length === 0 || remainingSlots <= 0) {
    return { selected: [] as number[], nextCursor: cursor };
  }

  const selected = [...selectedProviderIds];
  const newPoolSelections: number[] = [];
  let lastVisitedIndex = cursor;

  for (let offset = 0; offset < poolRules.length && newPoolSelections.length < remainingSlots; offset += 1) {
    const index = (cursor + offset) % poolRules.length;
    const rule = poolRules[index];
    const quota = quotaByProviderId.get(rule.providerId);
    lastVisitedIndex = index;

    if (!hasCapacity(quota) || selected.includes(rule.providerId)) {
      continue;
    }

    selected.push(rule.providerId);
    newPoolSelections.push(rule.providerId);
  }

  const nextCursor =
    newPoolSelections.length > 0 ? (lastVisitedIndex + 1) % poolRules.length : cursor;

  return {
    selected: newPoolSelections,
    nextCursor,
  };
}

async function getActiveQuotaCycle(tx: TransactionClient) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "QuotaCycle"
    WHERE "active" = true
    FOR UPDATE
  `;

  const cycle = await tx.quotaCycle.findFirst({
    where: { active: true },
    orderBy: { startedAt: "desc" },
  });

  if (!cycle) {
    throw new AllocationError("No active quota cycle found. Seed the database first.");
  }

  return cycle;
}

async function lockAllocationState(tx: TransactionClient, serviceId: number) {
  await tx.$queryRaw`
    SELECT "serviceId"
    FROM "ServiceAllocationState"
    WHERE "serviceId" = ${serviceId}
    FOR UPDATE
  `;
}

async function lockProviderQuotaRows(
  tx: TransactionClient,
  quotaCycleId: string,
  providerIds: number[],
) {
  if (providerIds.length === 0) {
    return;
  }

  await tx.$queryRaw`
    SELECT "providerId"
    FROM "ProviderQuota"
    WHERE "quotaCycleId" = ${quotaCycleId}
      AND "providerId" IN (${Prisma.join(providerIds)})
    FOR UPDATE
  `;
}

async function allocateInsideTransaction(tx: TransactionClient, rawInput: CreateLeadInput) {
  const input = createLeadSchema.parse(rawInput);
  const phoneNormalized = normalizePhoneNumber(input.phoneNumber);

  const lead = await tx.lead.create({
    data: {
      name: input.name,
      phoneRaw: input.phoneNumber,
      phoneNormalized,
      city: input.city,
      description: input.description,
      serviceId: input.serviceId,
    },
  });

  const activeCycle = await getActiveQuotaCycle(tx);
  await lockAllocationState(tx, input.serviceId);

  const allocationState = await tx.serviceAllocationState.findUnique({
    where: { serviceId: input.serviceId },
  });

  if (!allocationState) {
    throw new AllocationError(`Missing allocation state for service ${input.serviceId}.`);
  }

  const rules = await tx.serviceRule.findMany({
    where: { serviceId: input.serviceId },
    orderBy: [{ position: "asc" }, { providerId: "asc" }],
  });

  const eligibleProviderIds = [...new Set(rules.map((rule) => rule.providerId))];
  await lockProviderQuotaRows(tx, activeCycle.id, eligibleProviderIds);

  const quotaRows = await tx.providerQuota.findMany({
    where: {
      quotaCycleId: activeCycle.id,
      providerId: { in: eligibleProviderIds },
    },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          monthlyQuota: true,
        },
      },
    },
  });

  const quotaByProviderId = new Map(quotaRows.map((row) => [row.providerId, row]));
  const mandatoryRules = rules.filter((rule) => rule.type === ServiceRuleType.MANDATORY);
  const fairPoolRules = rules.filter((rule) => rule.type === ServiceRuleType.FAIR_POOL);
  const selectedProviderIds: number[] = [];

  for (const rule of mandatoryRules) {
    const quota = quotaByProviderId.get(rule.providerId);
    if (hasCapacity(quota) && !selectedProviderIds.includes(rule.providerId)) {
      selectedProviderIds.push(rule.providerId);
    }
  }

  const fairSelection = computeRoundRobinSelection(
    fairPoolRules,
    allocationState.cursor,
    REQUIRED_PROVIDER_COUNT - selectedProviderIds.length,
    quotaByProviderId,
    selectedProviderIds,
  );

  selectedProviderIds.push(...fairSelection.selected);

  if (selectedProviderIds.length !== REQUIRED_PROVIDER_COUNT) {
    throw new AllocationError(
      `Service ${input.serviceId} could not be assigned to exactly ${REQUIRED_PROVIDER_COUNT} providers because the eligible quota pool is exhausted.`,
    );
  }

  await tx.leadAssignment.createMany({
    data: selectedProviderIds.map((providerId) => ({
      leadId: lead.id,
      providerId,
      quotaCycleId: activeCycle.id,
    })),
  });

  for (const providerId of selectedProviderIds) {
    await tx.providerQuota.update({
      where: {
        providerId_quotaCycleId: {
          providerId,
          quotaCycleId: activeCycle.id,
        },
      },
      data: {
        assignedCount: { increment: 1 },
      },
    });
  }

  if (fairPoolRules.length > 0) {
    await tx.serviceAllocationState.update({
      where: { serviceId: input.serviceId },
      data: { cursor: fairSelection.nextCursor },
    });
  }

  return tx.lead.findUniqueOrThrow({
    where: { id: lead.id },
    include: {
      service: true,
      assignments: {
        include: {
          provider: true,
        },
        orderBy: {
          providerId: "asc",
        },
      },
    },
  });
}

export async function createLeadWithAssignments(rawInput: CreateLeadInput) {
  for (let attempt = 1; attempt <= LEAD_ALLOCATION_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => allocateInsideTransaction(tx, rawInput),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateLeadError();
      }

      if (isRetryableTransactionError(error) && attempt < LEAD_ALLOCATION_RETRY_LIMIT) {
        continue;
      }

      throw error;
    }
  }

  throw new AllocationError("Lead allocation failed after multiple transaction retries.");
}

export type AllocatedLead = Lead & {
  assignments: Array<LeadAssignment & { provider: { id: number; name: string; monthlyQuota: number } }>;
  service: { id: number; slug: string; name: string };
};
