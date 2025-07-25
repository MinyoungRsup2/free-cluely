export const getTransactions = async (btId: any): Promise<any | null> => {
  const query = `
query getTransactionsByBoughtTreatmentIds($btId: String!) {
  transactions(
    where: {
      charges: { some: { boughtTreatmentId: { equals: $btId } } }
      paidDate: { not: null }
    }
  ) {
    id
    paidDate
    userId
    charges {
      orgId
      transactionId
      total
      id
    }
  }
}

  `;

  const variables = { btId };

  try {
    const res = await fetch(process.env.CHECKOUT_API_URL!, {
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

    return data.transactions;
  } catch (error) {}
};
