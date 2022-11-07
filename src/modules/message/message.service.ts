import prisma from "../../utils/prisma";
import { CreateMessageInput } from "./message.dto";

export async function createMessage({ userId, ...input }: CreateMessageInput) {
  return await prisma.message.create({
    data: {
      ...input,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export async function findMessages() {
  return await prisma.message.findMany();
}
