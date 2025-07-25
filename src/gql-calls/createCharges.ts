export const createCharges = async (
  charges: any[],
): Promise<{ id: string }[]> => {
  const query = `
    mutation CreateCharges($charges: [ChargeDto!]!) {
      createCharges(charges: $charges) {
        id
      }
    }
  `;

  try {
    const res = await fetch(process.env.CHECKOUT_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SECURITY_SCHEMA_JWT}`,
      },
      body: JSON.stringify({ query, variables: { charges } }),
    });

    const { data, errors } = await res.json();

    if (errors) {
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    if (!data?.createCharges) {
      throw new Error("createCharges mutation returned null or undefined result");
    }

    return data.createCharges as { id: string }[];
  } catch (error) {
    throw new Error(
      `createCharges failed: ${
        error instanceof Error ? error.message : "Unknown error"
      } (charges: ${JSON.stringify(charges)})`,
    );
  }
};