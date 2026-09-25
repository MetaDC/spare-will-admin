export interface Setting {
  id: string; // Document ID: "sets"
  businessName: string;
  businessEmail: string;
  businessCallingNumber: string;
  callingNumber?: string; // backward-compatible alias
  whatsappNumber: string;
  defaultGreetingMsg: string;
  defaultGreeting?: string; // backward-compatible alias
  inquiryCount?: number;
  createdAt?: any;
  updatedAt?: any;
}
