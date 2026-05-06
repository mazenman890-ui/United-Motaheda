import { Body, Controller, Post } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import type { DeliveryQuoteRequest } from "@pharmacy/contracts";
import { DeliveryQuoteRequestSchema } from "@pharmacy/contracts";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post("quote")
  async quote(@Body() body: unknown) {
    const input: DeliveryQuoteRequest = DeliveryQuoteRequestSchema.parse(body);
    return this.delivery.quote(input);
  }
}

