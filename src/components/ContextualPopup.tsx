import React, { useState } from 'react'
import { X, Target, Zap, Info, ChevronDown, ChevronRight, DollarSign, Calendar, Shield, MapPin } from 'lucide-react'
import { createOneAppointment } from '../gql-calls/createOneAppointment'
import { consumer } from '../dummy/consumer'
import { v4 as uuidv4 } from "uuid";
import { addMinutes } from 'date-fns'
import { payCharges } from '../gql-calls/payCharges';
import { getTransactions } from '../gql-calls/getTransactions';

interface FocusedElementResponse {
  element: {
    type: string
    description: string
    confidence: number
    detected_structure: {
      [key: string]: {
        text: string
        confidence: number
        position_found?: string // Optional field for actual position detected
      }
    }
    suggested_actions: string[]
    ehr_context?: {
      page_type: string
      likely_workflow?: string
    }
  }
  context: {
    appears_to_be: string
    ui_pattern: string
    confidence?: number
  }
  metadata : any;
}

interface ContextualPopupProps {
  data: FocusedElementResponse
  onClose: () => void
  onActionClick: (action: string) => void
  position: { x: number; y: number }
}

export type BoughtTreatments = BoughtTreatment[];

export interface BoughtTreatment {
  id: string;
  name: string;
  consumerId: string;
  pricedTreatmentId: number;
  price: number;
  createdAt: string; // ISO-8601
  insuranceIds: string[];
  orgId: number;
  source: "storefront" | "pc";
  status: "active";
  updatedAt: string; // ISO-8601
  paymentType: "SELFPAY" | "SELFPAYOVERRIDE";
  discountCodeApplied: null;
  overrideReason: null;
  lastUpdatedBy: string | null;
  isVirtual: boolean;
}

export interface Consumer {
  id: string;
  firstname: string;
  lastname: string;
  ehrPatientId: string;
}


// Treatment card component with collapsible details
const TreatmentCard: React.FC<{ treatment: BoughtTreatment; collectPayment: (treatment: BoughtTreatment) => Promise<void> }> = ({ treatment, collectPayment }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price / 100) // Assuming price is in cents
  }
  
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden mb-2 transition-all duration-200 hover:bg-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white/90">{treatment.name}</h4>
            <p className="text-xs text-white/60">{formatPrice(treatment.price)}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/50" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Date Info */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-3 h-3 text-white/50" />
              <div>
                <p className="text-xs text-white/50">Created</p>
                <p className="text-xs text-white/80">{formatDate(treatment.createdAt)}</p>
              </div>
            </div>
            
            {/* Payment Type */}
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3 text-white/50" />
              <div>
                <p className="text-xs text-white/50">Payment</p>
                <p className="text-xs text-white/80">{treatment.paymentType}</p>
              </div>
            </div>
            
            {/* Source */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-3 h-3 text-white/50" />
              <div>
                <p className="text-xs text-white/50">Source</p>
                <p className="text-xs text-white/80">{treatment.source}</p>
              </div>
            </div>
            
            {/* Status */}
            <div className="flex items-center space-x-2">
              <Info className="w-3 h-3 text-white/50" />
              <div>
                <p className="text-xs text-white/50">Status</p>
                <p className="text-xs text-white/80 capitalize">{treatment.status}</p>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/50 mb-1">Additional Details</p>
            <div className="space-y-1">
              <div className="text-xs text-white/70">
                <span className="text-white/50">ID:</span> {treatment.id}
              </div>
              <div className="text-xs text-white/70">
                <span className="text-white/50">Treatment ID:</span> {treatment.pricedTreatmentId}
              </div>
              {treatment.isVirtual && (
                <div className="text-xs text-white/70">
                  <span className="text-white/50">Type:</span> Virtual
                </div>
              )}
              {treatment.insuranceIds.length > 0 && (
                <div className="text-xs text-white/70">
                  <span className="text-white/50">Insurance:</span> {treatment.insuranceIds.length} plan(s)
                </div>
              )}
            </div>
          </div>

          <button className='bg-blue-500 text-white px-4 py-2 rounded' onClick={() => collectPayment(treatment)}>Collect Payment</button>
        </div>
      )}
    </div>
  )
}

export const ContextualPopup: React.FC<ContextualPopupProps> = ({
  data,
  onClose,
  onActionClick
}) => {
  const { element, context ,metadata} = data


  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase()
    if (lowerAction.includes('click') || lowerAction.includes('select')) return <Target className="w-4 h-4" />
    if (lowerAction.includes('view') || lowerAction.includes('open')) return <Info className="w-4 h-4" />
    return <Zap className="w-4 h-4" />
  }

  const collectPayment = async (boughtTreatment : BoughtTreatment) => {
    const appointmentId = uuidv4() // Generate a unique appointment ID
    const slotId = uuidv4() // Generate a unique slot ID

    // const appointment =
    // {
    //     "id": appointmentId,
    //     "intakeFormIds": [],
    //     "isIntakeComplete": false,
    //     "intakeBypassed": false,
    //     "appointmentDate": new Date(),
    //     "location": {
    //         "label": "Sorin Medical",
    //         "id": "28",
    //         "practiceId": 28,
    //         "timezone": "America/New_York"
    //     },
    //     "slots": [
    //         {
    //             "id": slotId,
    //             "ehrVisitIds": [],
    //             "note": null,
    //             "procedures": [
    //                 {
    //                     "label": "Medical Consult - Follow Up",
    //                     "id": 429,
    //                     "selectedPaymentType": "INSURANCE",
    //                     "hrtId": 429,
    //                     "name": "Medical Consult - Follow Up",
    //                     "displayName": "Medical Consult - Follow Up",
    //                     "displayMetadata": {
    //                         "description": [
    //                             {
    //                                 "type": "body-sm",
    //                                 "value": "For existing Hudson Medical patients only. Schedule your follow-up consultation."
    //                             }
    //                         ],
    //                         "imageUrl": "https://rsup2.b-cdn.net/Hudson%20Medical/BNB_8585-Edit.jpg"
    //                     },
    //                     "ehrPrimaryAppointmentTypeId": [
    //                         "926"
    //                     ],
    //                     "isConsumerFacing": true,
    //                     "popularity": 0.5,
    //                     "isBookableOnStorefront": true,
    //                     "customDuration": 15,
    //                     "productToHrt": [
    //                         {
    //                             "productId": 245,
    //                             "__typename": "ProductToHrt"
    //                         },
    //                         {
    //                             "productId": 266,
    //                             "__typename": "ProductToHrt"
    //                         }
    //                     ],
    //                     "_count": {
    //                         "activeProviderGroups": 2,
    //                         "__typename": "HrtCount"
    //                     },
    //                     "HrtFlags": [],
    //                     "hrtPaymentType": [
    //                         {
    //                             "paymentType": "INSURED",
    //                             "__typename": "HrtPaymentType"
    //                         },
    //                         {
    //                             "paymentType": "CASH",
    //                             "__typename": "HrtPaymentType"
    //                         }
    //                     ],
    //                     "cash_prices": {
    //                         "cashPrice": 17500,
    //                         "__typename": "CashPrice"
    //                     },
    //                     "providerGroupToHrt": [
    //                         {
    //                             "isActive": true,
    //                             "notBookable": null,
    //                             "providerGroup": {
    //                                 "providerGroupId": 56,
    //                                 "practiceId": 28,
    //                                 "__typename": "ProviderGroup"
    //                             },
    //                             "__typename": "ProviderGroupToHrt"
    //                         },
    //                         {
    //                             "isActive": true,
    //                             "notBookable": true,
    //                             "providerGroup": {
    //                                 "providerGroupId": 104,
    //                                 "practiceId": 28,
    //                                 "__typename": "ProviderGroup"
    //                             },
    //                             "__typename": "ProviderGroupToHrt"
    //                         }
    //                     ],
    //                     "__typename": "Hrt",
    //                     "hrtFlags": {},
    //                     "clientSideProcedureId": "024fe31d-8b68-45d1-9fa0-529d7bc47718"
    //                 }
    //             ],
    //             "provider": {
    //                 "label": "Jonathann Kuo",
    //                 "id": "83",
    //                 "providerGroupIds": [
    //                     20,
    //                     32,
    //                     54,
    //                     33,
    //                     108,
    //                     104,
    //                     105
    //                 ],
    //                 "image": "https://rsup2.b-cdn.net/extensionhealth/provider-photos/Kuo_EH_Headshot%201.png",
    //                 "firstName": "Jonathann",
    //                 "lastName": "Kuo"
    //             },
    //             "slotPaymentType": "INSURANCE",
    //             "clientStatus": "NEW",
    //             "slotStartTime": new Date(),
    //             "location": {
    //                 "label": "Hudson Medical",
    //                 "id": "28",
    //                 "practiceId": 28,
    //                 "timezone": "America/New_York"
    //             },
    //             "slotEndTime": addMinutes(new Date(), 60),
    //             "customSlot": true,
    //             "skipEhr": true,
    //         }
    //     ],
    //     "status": "upcoming"
    // }


    // const charges = createOneAppointment(appointment, appointment.slots, consumer, 1 )

    const transactions = await getTransactions(boughtTreatment.id)
    const userId = transactions?.[0]?.userId || consumer.id
    const charges = transactions?.[0]?.charges || []
    const res = await payCharges(userId, charges)
  }

  console.log('🔍 ContextualPopup data:', data)
  console.log('🔍 ContextualPopup metadata:', metadata  )
  const boughtTreatments : BoughtTreatments = metadata?.boughtTreatments.boughtTreatments || []
  const consumer : Consumer = metadata?.consumer.findFirstConsumer || {}




  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-md p-4"
      style={{
        borderRadius: '27px',
        background: 'linear-gradient(0deg, rgba(245, 245, 245, 0.40) 0%, rgba(245, 245, 245, 0.40) 100%), #0F0F0F',
        backgroundBlendMode: 'normal, color-dodge',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white/80 rounded-full"></div>
          <h3 className="font-semibold text-white truncate">{consumer.firstname} {consumer.lastname}</h3>
          <h4 className="text-sm text-white/70">{consumer.ehrPatientId}</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Bought Treatments */}
        {boughtTreatments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/90">Patient Treatments</span>
              <span className="text-xs text-white/50">{boughtTreatments.length} found</span>
            </div>
            <div className="space-y-2">
              {boughtTreatments.map((treatment) => (
                <TreatmentCard key={treatment.id} treatment={treatment} collectPayment={collectPayment} />
              ))}
            </div>
          </div>
        )}
        
      
        {/* Context Information */}
        <div>
          <span className="text-sm font-medium text-white/90 block mb-2">Context</span>
          <div className="space-y-1">
            <div className="text-sm text-white/70">{context.appears_to_be}</div>
            <div className="text-xs text-white/50">Pattern: {context.ui_pattern}</div>
            {element.ehr_context?.likely_workflow && (
              <div className="text-xs text-blue-300">Workflow: {element.ehr_context.likely_workflow}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div>
          <span className="text-sm font-medium text-white/90 block mb-3">Suggested Actions</span>
          <div className="space-y-2">
            {element.suggested_actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onActionClick(action)}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-white/10 border border-white/20 rounded-lg transition-colors group backdrop-blur-sm"
              >
                <div className="flex-shrink-0 text-white/60 group-hover:text-white/90">
                  {getActionIcon(action)}
                </div>
                <span className="text-sm text-white/80 group-hover:text-white/95">
                  {action}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

   
    </div>
  )
}