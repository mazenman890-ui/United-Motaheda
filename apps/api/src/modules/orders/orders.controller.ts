import { Body, Controller, Post } from "@nestjs/common";
import type { CreateOrderRequest } from "@pharmacy/contracts";
import { CreateOrderRequestSchema } from "@pharmacy/contracts";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  async create(@Body() body: unknown) {
    const input: CreateOrderRequest = CreateOrderRequestSchema.parse(body);
    return this.orders.create(input);
  }
}
