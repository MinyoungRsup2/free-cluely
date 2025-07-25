export const updateOneAppointmentAndOneSlot = async (
  id: string,
  intakeFormIds: number[],
  slotId: string,
  slot: any,
): Promise<any> => {
  const query = `
    mutation UpdateOneAppointmentAndOneSlot(
      $id: String!
      $intakeFormIds: [Int!]!
      $slotId: String!
      $slot: SlotUpdateWithoutAppointmentInput!
    ) {
      updateOneAppointment(
        where: { id: $id }
        data: {
          intakeFormIds: { set: $intakeFormIds }
          slots: { update: { where: { id: $slotId }, data: $slot } }
        }
      ) {
        id
        status
        intakeFormIds
        slots {
          id
          start
          end
          appointmentId
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
      }
    }
  `;

  const variables = { id, intakeFormIds, slotId, slot };

  try {
    const res = await fetch(process.env.PC_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SECURITY_SCHEMA_JWT}`,
      },
      cache: "no-cache",
      body: JSON.stringify({ query, variables }),
    });

    const { data, errors } = await res.json();

    if (errors) {
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return data;
  } catch (error) {
    throw new Error(
      `updateOneAppointmentAndOneSlot failed: ${
        error instanceof Error ? error.message : "Unknown error"
      } (id: ${id}, slotId: ${slotId})`,
    );
  }
};