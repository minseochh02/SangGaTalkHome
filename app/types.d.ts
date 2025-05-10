import { Order, OrderItem, Product } from "@/utils/type";

// Add the ExtendedOrder type to avoid TypeScript errors
declare module "@/utils/type" {
  interface ExtendedOrder extends Order {
    items?: (OrderItem & {
      product?: Product;
    })[];
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_wallet?: string;
    recipient_name?: string;
    phone_number?: string;
  }
} 