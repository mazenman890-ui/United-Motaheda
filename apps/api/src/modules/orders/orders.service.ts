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

    const created = await this.prisma.orders.create({
      data: {
        idempotency_key:    input.idempotencyKey,
        customer_name:      input.customerName,
        customer_phone:     input.customerPhone,
        customer_address:   input.address as any,
        note:               [input.note, `branch:${status.branch.id}`, status.zoneId ? `zone:${status.zoneId}` : ""].filter(Boolean).join(" | "),
        subtotal:           input.expectedPricing.subtotal,
        discount_total:     input.expectedPricing.discount ?? 0,
        tax_total:          input.expectedPricing.tax ?? 0,
        shipping_fee:       input.expectedPricing.deliveryFee ?? 0,
        total:              input.expectedPricing.total,
        payment_method:     input.paymentMethod,
        status:             "pending",
        order_items: {
          create: input.cart.items.map((item: any) => ({
            product_id:       item.productId,
            quantity:         item.quantity,
            unit_price:       item.unitPrice,
            line_total:       item.quantity * item.unitPrice,
            product_snapshot: { name: item.name, unitPrice: item.unitPrice },
          })),
        },
      },
    });

    return {
      orderId:   created.id,
      createdAt: created.created_at.toISOString(),
      status:    created.status,
    };
  }
}
