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
            firstname
            lastname
            ehrPatientId
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


  export const findBoughtTreatmentByConsumerId = async (consumerId: string): Promise<any> => {
    try {
      const apiUrl = process.env.PC_API_URL
      if (!apiUrl) {
        throw new Error("PC_API_URL environment variable not set")
      }

      // Use native fetch for GraphQL query
      const query = `
      fragment boughtTreatmentFields on BoughtTreatment {
        id
        name
        consumerId
        pricedTreatmentId
        price
        createdAt
        insuranceIds
        orgId
        source
        status
        updatedAt
        paymentType
        discountCodeApplied
        overrideReason
        lastUpdatedBy
        isVirtual
      }

      query GetBoughtTreatmentsByConsumerId($consumerId:String!) {
        boughtTreatments(where :{
          consumerId : {equals : $consumerId } 
        }) {
          ...boughtTreatmentFields
        }
      }
      `


      const variables = { consumerId }

      console.log("JWT Token:", process.env.SECURITY_SCHEMA_JWT ? "Present" : "Missing")
      console.log("Request headers:", {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SECURITY_SCHEMA_JWT}`,
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_SCHEMA_JWT}`,
        },
        body: JSON.stringify({
          query,
          variables
        })
      })

      console.log("Response:", response)
      
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
