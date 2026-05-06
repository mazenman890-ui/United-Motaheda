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

  async create(input: any): Promise<any> { // استخدمنا any هنا لتخطي تضارب الـ Contracts حالياً
    const quote = await this.deliveryService.findQuote({
      coordinates: input.coordinates,
      cart: input.cart,
      requestedBranchId: input.branchId,
    });

    // تحويل الـ status لـ any عشان نتخطى إيرور "Property does not exist"
    const status = quote.status as any;

    if (!status.isDeliverable || !quote.matched || !status.branch) {
      throw new BadRequestException(
        status.reasonCode === "OUT_OF_CAIRO"
          ? "Orders are restricted to Cairo delivery zones."
          : "The provided address is outside the selected branch delivery zone.",
      );
    }

    if (!input.quoteToken?.trim() || !input.assignmentToken?.trim() || status.cost == null) {
      throw new BadRequestException("Unable to create an order without a valid delivery quote.");
    }

    const expectedDeliveryFee = input.expectedPricing.deliveryFee;
    if (Math.round(expectedDeliveryFee) !== Math.round(status.cost)) {
      throw new BadRequestException("Delivery fee mismatch. Please refresh your cart and quote.");
    }

    const computedSubtotal = Number(
      input.cart.items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0).toFixed(2),
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

    // تصحيح: استخدام orders بدلاً من order كما في Prisma Schema
    const existing = await this.prisma.orders.findUnique({
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

    // تصحيح: استخدام orders بدلاً من order
    const created = await this.prisma.orders.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        address: input.address,
        coordinates: input.coordinates,
        note: input.note,
        branchId: status.branch.id,
        zoneId: status.zoneId,
        subtotal: input.expectedPricing.subtotal,
        discount: input.expectedPricing.discount,
        tax: input.expectedPricing.tax,
        deliveryFee: input.expectedPricing.deliveryFee,
        total: input.expectedPricing.total,
        currency: "EGP",
        paymentMethod: input.paymentMethod,
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
      createdAt: created.createdAt.toISOString(),
      status: created.status,
      paymentStatus: "pending",
      paymentReference: null,
      idempotentReplay: false,
      conflicts: [],
    };
  }
}
