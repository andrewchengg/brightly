import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/api-protection";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(async (auth) => {
    try {
      const reports = await prisma.questionReport.findMany({
        include: {
          question: {
            select: {
              id: true,
              text: true,
              questionType: true,
              difficulty: true,
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(reports);
    } catch (error) {
      console.error("Error fetching question reports:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: Request) {
  return withAdminAuth(async (auth) => {
    try {
      const body = await request.json();
      const { reportId, status } = body;

      if (!reportId || !status) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const updatedReport = await prisma.questionReport.update({
        where: { id: reportId },
        data: { status },
      });

      return NextResponse.json(updatedReport);
    } catch (error) {
      console.error("Error updating question report:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
