import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, studentId, reportType, description } = body;

    if (!questionId || !studentId || !reportType || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const report = await prisma.questionReport.create({
      data: {
        questionId,
        studentId,
        reportType,
        description,
        status: 'PENDING',
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating question report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 