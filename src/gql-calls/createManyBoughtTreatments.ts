export const createOneBoughtTreatment = async (
  variables: any,
): Promise<any | null> => {
  console.log(
    `createOneBoughtTreatment orgId: ${variables?.data?.orgId}, source: ${variables?.data?.source}, consumerId: ${variables?.data?.consumerId}`,
  );

  const query = `
    mutation CreateOneBoughtTreatment($data: BoughtTreatmentCreateInput!) {
      createOneBoughtTreatment(data: $data) {
        id
        orgId
        consumerId
        pricedTreatmentId
        price
        paymentType
        source
        insuranceIds
        createdAt
        updatedAt
      }
    }
  `;

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

    return data.createOneBoughtTreatment;
  } catch (error) {
    throw new Error(
      `createOneBoughtTreatment failed: ${
        error instanceof Error ? error.message : "Unknown error"
      } (orgId: ${variables?.data?.orgId}, source: ${
        variables?.data?.source
      }, consumerId: ${variables?.data?.consumerId}, pricedTreatmentId: ${
        variables?.data?.pricedTreatmentId
      }, paymentType: ${variables?.data?.paymentType}, price: ${
        variables?.data?.price
      }, insuranceIds: ${JSON.stringify(variables?.data?.insuranceIds)})`,
    );
  }
};


export const createManyBoughtTreatments = async (
  variables: any[],
): Promise<any[] | null> => {
  const variablesArray = variables.map((variable) => ({
    data: variable,
  }));
  const boughtTreatments = await Promise.all(
    variablesArray.map((variable) => createOneBoughtTreatment(variable.data)),
  );
  if (!boughtTreatments) return null;
  return boughtTreatments.filter(
    (boughtTreatment) => boughtTreatment !== null,
  ) as any[];
};
