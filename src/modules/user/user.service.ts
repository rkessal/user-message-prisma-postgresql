import prisma from "../../utils/prisma";
import { LoginUserInput, RegisterUserInput } from "./user.dto";
import argon2 from "argon2";

export async function createUser(input: RegisterUserInput) {
  const password = await argon2.hash(input.password);
  return await prisma.user.create({
    data: {
      ...input,
      email: input.email.toLocaleLowerCase(),
      username: input.username.toLocaleLowerCase(),
      password,
    },
  });
}

export async function findUserByEmailOrUsername(
  input: LoginUserInput["usernameOrEmail"]
) {
  return await prisma.user.findFirst({
    where: {
      OR: [{ username: input }, { email: input }],
    },
  });
}

export async function verifyPassword({
  password,
  candidatePassword,
}: {
  password: string;
  candidatePassword: string;
}) {
  return argon2.verify(password, candidatePassword);
}

export async function followUser({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      following: {
        connect: {
          username,
        },
      },
    },
  });
}

export async function unfollowUser({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      following: {
        disconnect: {
          username,
        },
      },
    },
  });
}

export async function findUsers() {
  return await prisma.user.findMany();
}

export async function findUserFollowing(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      following: true,
    },
  });
}

export async function findUserFollowedBy(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      followedBy: true,
    },
  });
}

export async function findFollowers(userId: string) {
  return await prisma.user.findMany({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      followedBy: true,
    },
  });
}

export async function findUserById(userId: string) {
  return await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
}
