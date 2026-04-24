import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class OrdersGateway {
  @WebSocketServer()
  server!: Server;

  emitEvent(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}
