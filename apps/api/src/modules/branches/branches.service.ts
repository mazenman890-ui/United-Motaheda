import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { nameEn: "asc" },
    });
  }
}

