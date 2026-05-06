import { Module } from "@nestjs/common";
import { DeliveryModule } from "../delivery/delivery.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
