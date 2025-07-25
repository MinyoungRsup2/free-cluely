export const findConsumerByEhrPatientId = async (ehrPatientId: string): Promise<any> => {
    try {
      const apiUrl = process.env.USERS_API_URL
      if (!apiUrl) {
        throw new Error("USERS_API_URL environment variable not set")
      }

      // Use native fetch for GraphQL query
      const query = `
        query findConsumerByEhrPatientId($ehrPatientId: String!) {
          findFirstConsumer(where: { ehrPatientId: { equals: $ehrPatientId } }) {
            id
          }
        }
      `
      
      const variables = { ehrPatientId }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }
      
      console.log(`GraphQL response:`, data)
      return data.data
      
    } catch (error) {
      console.error("Error querying GraphQL API:", error)
      throw error
    }
  }

  export const findConsumerByName = async (firstName: string, lastName: string): Promise<any> => {
    try {
      const apiUrl = process.env.USERS_API_URL
      if (!apiUrl) {
        throw new Error("USERS_API_URL environment variable not set")
      }

      // Use native fetch for GraphQL query
      const query = `
        query findConsumerByName($firstName: String!, $lastName: String!) {
          findFirstConsumer(
            where: {
              AND: [
                { firstname: { equals: $firstName } }
                { lastname: { equals: $lastName } }
              ]
            }
          ) {
            id
          }
        }
      `

      const variables = { firstName, lastName }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }
      
      console.log(`GraphQL response:`, data)
      return data.data
      
    } catch (error) {
      console.error("Error querying GraphQL API:", error)
      throw error
    }
  }

export const createOneAppointmentAndManySlots = async (
  id: string,
  status: any,
  intakeFormIds: number[],
  slots: any[],
  userId?: string,           // unused in the query itself
  isCheckout = false,
): Promise<any> => {
  const query = `
    mutation CreateOneAppointmentAndManySlots(
      $id: String!
      $status: AppointmentStatusEnum!
      $intakeFormIds: [Int!]!
      $slots: [SlotCreateManyAppointmentInput!]!
    ) {
      createOneAppointment(
        data: {
          id: $id
          status: $status
          intakeFormIds: { set: $intakeFormIds }
          slots: { createMany: { data: $slots } }
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

  const variables = { id, status, intakeFormIds, slots };

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

    return data.createOneAppointment;
  } catch (error) {
    throw new Error(
      `createOneAppointmentAndManySlots failed: ${
        error instanceof Error ? error.message : "Unknown error"
      } (id: ${id}, status: ${status}, isCheckout: ${isCheckout}, slots length: ${
        slots?.length
      })`,
    );
  }
};