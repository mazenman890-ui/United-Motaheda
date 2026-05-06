import { BadRequestException, Injectable } from "@nestjs/common";
import type { CreateOrderRequest, CreateOrderResult } from "@pharmacy/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../delivery/delivery.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async create(input: CreateOrderRequest): Promise<CreateOrderResult> {
    const quote = await this.deliveryService.findQuote({
      coordinates: input.coordinates,
      cart: input.cart,
      requestedBranchId: input.branchId,
    });

    if (!quote.status.isDeliverable || !quote.matched || !quote.status.branch) {
      throw new BadRequestException(
        quote.status.reasonCode === "OUT_OF_CAIRO"
          ? "Orders are restricted to Cairo delivery zones."
          : "The provided address is outside the selected branch delivery zone.",
      );
    }

    if (!input.quoteToken.trim() || !input.assignmentToken.trim() || quote.status.cost == null) {
      throw new BadRequestException("Unable to create an order without a valid delivery quote.");
    }

    const expectedDeliveryFee = input.expectedPricing.deliveryFee;
    if (Math.round(expectedDeliveryFee) !== Math.round(quote.status.cost)) {
      throw new BadRequestException("Delivery fee mismatch. Please refresh your cart and quote.");
    }

    const computedSubtotal = Number(
      input.cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2),
    );

    if (Math.abs(computedSubtotal - input.expectedPricing.subtotal) > 0.01) {
      throw new BadRequestException("Cart subtotal mismatch. Please refresh your cart.");
    }

    const computedTotal = Number(
      (
        input.expectedPricing.subtotal
        - input.expectedPricing.discount
        + input.expectedPricing.tax
        + input.expectedPricing.deliveryFee
      ).toFixed(2),
    );

    if (Math.abs(computedTotal - input.expectedPricing.total) > 0.01) {
      throw new BadRequestException("Order total mismatch. Please refresh your cart.");
    }

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) {
      return {
        orderId: existing.id,
        createdAt: existing.createdAt.toISOString(),
        status: existing.status,
        paymentStatus: "pending",
        paymentReference: null,
        idempotentReplay: true,
        conflicts: [],
      };
    }

    const created = await this.prisma.order.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        address: input.address,
        coordinates: input.coordinates,
        note: input.note,
        branchId: quote.status.branch.id,
        zoneId: quote.status.zoneId,
        subtotal: input.expectedPricing.subtotal,
        discount: input.expectedPricing.discount,
        tax: input.expectedPricing.tax,
        deliveryFee: input.expectedPricing.deliveryFee,
        total: input.expectedPricing.total,
        currency: "EGP",
        paymentMethod: input.paymentMethod,
        status: "pending",
        items: {
          create: input.cart.items.map((item) => ({
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
      createdAt: created.createdAt.toISOString(),
      status: created.status,
      paymentStatus: "pending",
      paymentReference: null,
      idempotentReplay: false,
      conflicts: [],
    };
  }
}
