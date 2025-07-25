
import { v4 as uuidv4 } from "uuid";

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


  return {
    data: {
      id: procedure.boughtTreatmentId ?? procedure.clientSideProcedureId,
      name: procedure.label,
      hrtId: procedure.hrtId,
      isVirtual: false,
      consumerId: consumerInfo.id,
      orgId: orgId,
      price: 100,
      pricedTreatmentId:  uuidv4(),
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
