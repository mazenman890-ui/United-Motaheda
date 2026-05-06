import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../delivery/delivery.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async create(input: any): Promise<any> {
    const quote = await this.deliveryService.findQuote({
      coordinates: input.coordinates,
      cart: input.cart,
      requestedBranchId: input.branchId,
    });

    const status = quote.status as any;

    if (!status.isDeliverable || !quote.matched || !status.branch) {
      throw new BadRequestException("Address outside delivery zone.");
    }

    // تعديل الحقول لـ snake_case عشان Prisma
    const created = await this.prisma.orders.create({
      data: {
        idempotency_key: input.idempotencyKey, 
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_address: input.address as any,
        note: input.note,
        branch_id: status.branch.id,
        zone_id: status.zoneId,
        subtotal: input.expectedPricing.subtotal,
        discount: input.expectedPricing.discount,
        tax: input.expectedPricing.tax,
        delivery_fee: input.expectedPricing.deliveryFee,
        total: input.expectedPricing.total,
        payment_method: input.paymentMethod,
        status: "pending",
        items: {
          create: input.cart.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            name: item.name,
          })),
        },
      },
    });

    return {
      orderId: created.id,
      createdAt: created.created_at.toISOString(),
      status: created.status,
    };
  }
}
