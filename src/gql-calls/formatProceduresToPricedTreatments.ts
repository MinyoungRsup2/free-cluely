
export enum EncounterSourceEnum {
  AleService = "ale_service",
  Kiosk = "kiosk",
  Pc = "pc",
  Storefront = "storefront",
}

export enum PaymentTypeEnum {
  Insurance = "INSURANCE",
  Insurancemakeitfree = "INSURANCEMAKEITFREE",
  Insuranceoverride = "INSURANCEOVERRIDE",
  InsuranceAdminCreated = "INSURANCE_ADMIN_CREATED",
  Selfpay = "SELFPAY",
  Selfpaydiscounted = "SELFPAYDISCOUNTED",
  Selfpayoverride = "SELFPAYOVERRIDE",
}


/**
 * Procedures need to have priced treatment id attached when
 * it gets sent to bought treatment
 * @param procedure
 * @param priceMode
 * @param priceMap
 * @param consumerInfo
 * @param insurances
 * @param slotId
 * @returns
 */
export const formatProcedureToPricedTreatment = (
  procedure: any,
  priceMode: PaymentTypeEnum,
  priceMap : any,
  consumerInfo : any,
  orgId: number,
  insurances : any,
  slotId?: string | undefined,
  adminEmail?: string,
) => {
  const mapId = procedure.boughtTreatmentId
    ? procedure.boughtTreatmentId
    : (procedure.clientSideProcedureId as string);

  // TODO: we can just pass price object here.  we already calculate the price
  // object in parent functions and we're just redoing it here
  const priceObject =
    priceMap.get(mapId)[priceMode] ?? priceMap.get(mapId).SELFPAY;

  return {
    data: {
      id: procedure.boughtTreatmentId ?? procedure.clientSideProcedureId,
      name: procedure.label,
      hrtId: procedure.hrtId,
      isVirtual: false,
      consumerId: consumerInfo.id,
      orgId: orgId,
      price: priceObject.price,
      pricedTreatmentId: priceObject.pricedTreatmentId,
      paymentType: procedure.selectedPaymentType,
      source: EncounterSourceEnum.Pc,
      lastUpdatedBy: adminEmail || "",
      ...(slotId && {
        slot: {
          connect: {
            id: slotId,
          },
        },
      }),
      ...(procedure.overrideReason && {
        overrideReason: procedure.overrideReason,
      }),
      insuranceIds: {
        set: insurances?.map((insurance :any) => insurance.id) ?? [],
      },
    },
  };
};
