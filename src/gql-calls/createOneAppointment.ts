import { createManyBoughtTreatments } from "./createManyBoughtTreatments";
import { formatProcedureToPricedTreatment, PaymentTypeEnum } from "./formatProceduresToPricedTreatments";
import { createOneAppointmentAndManySlots } from "./gqlClient";
import { v4 as uuidv4 } from "uuid";
import { updateOneAppointmentAndOneSlot } from "./updateOneAppointmentAndOneSlot";
import { createCharges } from "./createCharges";

export enum AppointmentStatusEnum {
  Active = "active",
  Canceled = "canceled",
  Completed = "completed",
  Missed = "missed",
  Upcoming = "upcoming",
}

export enum SlotStatusEnum {
  Canceled = "canceled",
  Completed = "completed",
  Deleted = "deleted",
  Upcoming = "upcoming",
}

export const formatSlotToGraphqlInput = (
  slot: any,
  query: "update" | "create" | "createWithAppointment",
  appointmentId?: string,
  past?: boolean,
): any => {
  const appointmentStartTime = slot.slotStartTime;
  const appointmentEndTime = slot.slotEndTime;

  const note = slot.note && typeof slot.note === "string" ? slot.note : null;
  const noteUpdatedAt =
    slot.noteUpdatedAt && typeof slot.noteUpdatedAt === "string"
      ? slot.noteUpdatedAt
      : null;
  const noteUpdatedBy =
    slot.noteUpdatedBy && typeof slot.noteUpdatedBy === "string"
      ? slot.noteUpdatedBy
      : null;

  /**
   * Create new slots at the same time as appointments
   */
  if (query === "create") {
    return {
      note: note,
      ...(noteUpdatedAt ? { noteUpdatedAt: noteUpdatedAt } : {}),
      noteUpdatedBy: noteUpdatedBy,
      startTime: appointmentStartTime,
      endTime: appointmentEndTime,
      providerId: Number.parseInt(slot.provider.id),
      // TODO: CLEAN THIS UP CAUSE WE ARE OVERLOADING SLOT LOCATION OBJECT WITH BOTH DROPDOWN AND PRACTICE VALUES
      practiceId: Number.parseInt(slot.location.id ?? slot.location.practiceId),
      status: past ? SlotStatusEnum.Completed : SlotStatusEnum.Upcoming,
      id: slot.id,
      ...(slot.reviewStatus
        ? { reviewStatus: { set: slot.reviewStatus } }
        : { reviewStatus: { set: [] } }),
      ...(slot.ehrSlotId
        ? { EhrSlot: { connect: { id: slot.ehrSlotId } } }
        : {}),
    };
  }

}


export const createOneAppointment = async (
  appointment: any,
  slots: any,
  priceMap: any,
  consumerInfo: any,
  orgId: number
): Promise<any> => {
  const clientGeneratedAppointmentId = uuidv4();

     /**
   * Slots could have been moved to a new appointment under 1 circumstance - it was separated from its
   * host appointment and had to create new appointments
   */
  const formattedSlots = slots
    .filter((slot : any) => slot.clientStatus !== "MOVED")
    .map((slot : any) => {
      const gqlSlot = formatSlotToGraphqlInput(slot, "create");
      return gqlSlot;
    });

  const intakeIds : any[] = [];

  /**
   * Create one appointments and as many slots attached to that appointment as possible
   */
  await createOneAppointmentAndManySlots(
    clientGeneratedAppointmentId,
    AppointmentStatusEnum.Upcoming,
    intakeIds,
    formattedSlots,
  );

  /**
   * Create map of clientSideProcedureIds to pricedTreatmentIds so that they can cross referenced for modifying slots later
   */
  const procedureIdToPricedTreatmentIdMap = new Map<string, number>();

  /**
   * Format price treatment so that it can be put into a mutation query
   */
  const formattedPricedTreatments = slots
    .filter((slot : any) => slot.clientStatus !== "MOVED")
    .flatMap((slot : any) => {
      return slot.procedures.map((procedure : any) => {
        const pricedTreatment = formatProcedureToPricedTreatment(
          procedure,
          procedure.selectedPaymentType as PaymentTypeEnum,
          priceMap,
          consumerInfo,
          orgId,
          [],
          slot.id,
          "minyoung@superscript.nyc",
        );

        procedureIdToPricedTreatmentIdMap.set(
          procedure.clientSideProcedureId ?? "",
          pricedTreatment.data.pricedTreatmentId,
        );

        return pricedTreatment;
      });
    });

  /**
   * Create Bought treatments from Priced treatments
   */
  const boughtTreatments = await createManyBoughtTreatments(
    formattedPricedTreatments,
  );

  if (!boughtTreatments) {
    throw new Error("Failed to create bought treatments");
  }
 
  /**
   * Modify slots to use boughtTreatmentIds instead of clientSideProcedureIds
   */
  const slotsWithBoughtTreatmentId = slots.map((slot :any) => {
    const proceduresWithBT = slot.procedures.map((procedure :any) => {
      const pricedTreatmentId = procedureIdToPricedTreatmentIdMap.get(
        procedure.clientSideProcedureId ?? "",
      );
      const newlyCreatedBt = boughtTreatments.find((boughtTreatment :any) => {
        return pricedTreatmentId === boughtTreatment.pricedTreatmentId;
      });
      return { ...procedure, boughtTreatmentId: newlyCreatedBt?.id ?? "" };
    });
    return { ...slot, procedures: proceduresWithBT };
  });

  /**
   * Create ehr-slots using the bought treatments, then update the slots in database
   */
  for (const slot of slotsWithBoughtTreatmentId) {

      /**
       * Associate the new slot with the new appointment, the order is flipped because the appointment has to be created before hand for it to be linked.
       */
      await updateOneAppointmentAndOneSlot(
        appointment.id,
        appointment.intakeFormIds ?? [],
        slot.id as string,
        {}
      );
  }

  /**
   * Create Charges
   */
  const chargeDtos: any[] = boughtTreatments
    ? boughtTreatments?.map((boughtTreatment) => ({
        boughtTreatmentId: boughtTreatment.id,
        orgId,
        total: boughtTreatment.price,
        type: "FEE",
        userId: consumerInfo.userId,
      }))
    : [];

  const charges = chargeDtos.length > 0 ? await createCharges(chargeDtos) : [];

  return charges;
}