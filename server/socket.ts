import { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;
export const connectedAdmins = new Set<string>();

export function initSocket(io: SocketIOServer) {
  _io = io;

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;
    const role = socket.handshake.auth?.role;

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      connectedAdmins.add(String(userId));
      io.emit("support_admin_status", { online: connectedAdmins.size > 0 });
      socket.join("admins");

      socket.on("admin_join_ticket", (ticketId: number) => {
        socket.join(`ticket_${ticketId}`);
      });

      socket.on("support_typing", ({ ticketId, typing }: { ticketId: number; typing: boolean }) => {
        io.to(`ticket_${ticketId}`).emit("support_typing", { typing });
      });

      socket.on("disconnect", () => {
        connectedAdmins.delete(String(userId));
        io.emit("support_admin_status", { online: connectedAdmins.size > 0 });
      });
    } else if (userId) {
      socket.join(`user_${userId}`);

      socket.on("user_join_ticket", (ticketId: number) => {
        socket.join(`ticket_${ticketId}`);
      });

      socket.on("disconnect", () => {});
    }
  });
}

export function getIO(): SocketIOServer {
  if (!_io) throw new Error("Socket.io not initialized");
  return _io;
}
