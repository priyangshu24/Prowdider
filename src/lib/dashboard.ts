import { prisma } from "@/lib/prisma";

export async function getDashboardSnapshot() {
  const activeCycle = await prisma.quotaCycle.findFirst({
    where: { active: true },
    orderBy: { startedAt: "desc" },
  });

  if (!activeCycle) {
    return {
      activeCycle: null,
      providers: [],
      totals: {
        totalLeads: 0,
        totalAssignments: 0,
      },
    };
  }

  const providers = await prisma.provider.findMany({
    orderBy: { id: "asc" },
    include: {
      quotaRecords: {
        where: { quotaCycleId: activeCycle.id },
      },
      assignments: {
        where: { quotaCycleId: activeCycle.id },
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  });

  const providerCards = providers.map((provider) => {
    const quotaRecord = provider.quotaRecords[0];
    const assignedCount = quotaRecord?.assignedCount ?? 0;

    return {
      id: provider.id,
      name: provider.name,
      monthlyQuota: provider.monthlyQuota,
      assignedCount,
      remainingQuota: provider.monthlyQuota - assignedCount,
      leads: provider.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        assignedAt: assignment.createdAt,
        leadId: assignment.lead.id,
        customerName: assignment.lead.name,
        phoneNumber: assignment.lead.phoneRaw,
        city: assignment.lead.city,
        description: assignment.lead.description,
        serviceName: assignment.lead.service.name,
      })),
    };
  });

  return {
    activeCycle: {
      id: activeCycle.id,
      externalCycleKey: activeCycle.externalCycleKey,
      startedAt: activeCycle.startedAt,
    },
    providers: providerCards,
    totals: {
      totalLeads: new Set(
        providerCards.flatMap((provider) => provider.leads.map((lead) => lead.leadId)),
      ).size,
      totalAssignments: providerCards.reduce((sum, provider) => sum + provider.assignedCount, 0),
    },
  };
}
