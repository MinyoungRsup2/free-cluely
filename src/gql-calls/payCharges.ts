export const payCharges = async (userId : string, charges : any[] ) => {
    // Implementation for paying charges
    const transaction = {
          userId: userId,
          stripePaymentId: '12512514212',
          chargeIds: charges.map((charge) => charge.id),
          paymentMethodType: "CARD",
          collectedBy: 'minyoung@superscript.nyc',
        }; 

    try {
    const url = `${process.env.PC_API_URL}charges/pay`;
    const jwt = process.env.SECURITY_SCHEMA_JWT;

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(transaction),
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
        securityschemas: `${jwt}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // New backend format: { status: 200, responseStatus: "SUCCESS", data: [...] }
    if (data?.status === 200 && data?.data && Array.isArray(data.data)) {
      return data.data as { id: string; transactionId: string }[];
    }

    // Direct array format
    if (Array.isArray(data)) {
      return data as { id: string; transactionId: string }[];
    }

    // GraphQL format: { payCharges: [...] }
    if (data?.payCharges && Array.isArray(data.payCharges)) {
      return data.payCharges as { id: string; transactionId: string }[];
    }

    throw new Error(`Unexpected response structure: ${JSON.stringify(data)}`);
  } catch (error) {
    throw new Error(
      `payCharges failed: ${
        error instanceof Error ? error.message : "Unknown error"
      } (metadata: ${JSON.stringify(transaction)})`,
    );
  }
};

