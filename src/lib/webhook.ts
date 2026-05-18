import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function processQuotaResetWebhook(
  eventId: string,
  payload?: Prisma.InputJsonValue,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const event = await tx.webhookEvent.create({
          data: {
            eventId,
            type: "subscription.renewed",
            payload,
          },
        });

        const currentCycle = await tx.quotaCycle.findFirst({
          where: { active: true },
          orderBy: { startedAt: "desc" },
        });

        if (currentCycle) {
          await tx.quotaCycle.update({
            where: { id: currentCycle.id },
            data: {
              active: false,
              endedAt: new Date(),
            },
          });
        }

        const providers = await tx.provider.findMany({
          orderBy: { id: "asc" },
          select: { id: true },
        });

        const newCycle = await tx.quotaCycle.create({
          data: {
            externalCycleKey: `cycle-${eventId}`,
            active: true,
            providerQuotas: {
              create: providers.map((provider) => ({
                providerId: provider.id,
                assignedCount: 0,
              })),
            },
          },
        });

        await tx.webhookEvent.update({
          where: { id: event.id },
          data: { quotaCycleId: newCycle.id },
        });

        return {
          alreadyProcessed: false,
          quotaCycleId: newCycle.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });

      return {
        alreadyProcessed: true,
        quotaCycleId: existingEvent?.quotaCycleId ?? null,
      };
    }

    throw error;
  }
}
