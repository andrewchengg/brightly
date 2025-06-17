"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { supabaseAdmin } from "./supabase/admin";

// Handle the case where Supabase could not be initialized
let supabaseClient = supabaseAdmin;

type CurrentState = { success: boolean; error: boolean };

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
      },
    });

    // Create SubjectTeacher relationships
    if (data.teachers && data.teachers.length > 0) {
      await prisma.subjectTeacher.createMany({
        data: data.teachers.map((teacherId) => ({
          subjectId: subject.id,
          teacherId: teacherId,
        })),
      });
    }

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
      },
    });

    // Update SubjectTeacher relationships
    if (data.teachers) {
      // Delete existing relationships
      await prisma.subjectTeacher.deleteMany({
        where: {
          subjectId: data.id,
        },
      });

      // Create new relationships
      if (data.teachers.length > 0) {
        await prisma.subjectTeacher.createMany({
          data: data.teachers.map((teacherId) => ({
            subjectId: data.id!,
            teacherId: teacherId,
          })),
        });
      }
    }

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    // Generate a default supervisor ID if not provided
    const supervisorId = data.supervisorId || "default-supervisor";

    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        supervisorId,
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await prisma.class.update({
      where: {
        id: data.id,
      },
      data,
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    let userId = `temp-${Date.now()}`;

    // Create user in Supabase Auth
    try {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email || `${data.username}@example.com`, // Supabase requires email
          password: data.password,
          user_metadata: {
            role: "teacher",
            username: data.username,
            name: data.name,
          },
          email_confirm: true, // Auto-confirm email for simplicity
        });

      if (authError) {
        console.error("Error creating Supabase auth user:", authError);
        return { success: false, error: true, message: authError.message };
      }

      userId = authData.user?.id ?? userId;
    } catch (authError) {
      console.error("Error creating Supabase auth user:", authError);
    }

    const teacher = await prisma.teacher.create({
      data: {
        id: userId,
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || "",
        bloodType: data.bloodType,
        sex: data.sex,
      },
    });

    // Create subject teacher relationships if subjects are provided
    if (data.subjects && data.subjects.length > 0) {
      await prisma.subjectTeacher.createMany({
        data: data.subjects.map((subjectId: string) => ({
          teacherId: teacher.id,
          subjectId: parseInt(subjectId),
        })),
        skipDuplicates: true,
      });
    }

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    // Update user in Supabase Auth
    try {
      const updateData: any = {
        user_metadata: {
          role: "teacher",
          username: data.username,
          name: data.name,
        },
      };

      // Only update email if provided
      if (data.email) {
        updateData.email = data.email;
      }

      // Only update password if provided
      if (data.password) {
        updateData.password = data.password;
      }

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(data.id, updateData);

      if (authError) {
        console.error("Error updating Supabase auth user:", authError);
      }
    } catch (authError) {
      console.error("Error updating Supabase auth user:", authError);
    }

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || "",
        bloodType: data.bloodType,
        sex: data.sex,
      },
    });

    // Handle subject teacher relationships
    if (data.subjects !== undefined && data.id) {
      // Remove existing relationships
      await prisma.subjectTeacher.deleteMany({
        where: {
          teacherId: data.id,
        },
      });

      // Create new relationships if subjects are provided
      if (data.subjects.length > 0) {
        await prisma.subjectTeacher.createMany({
          data: data.subjects.map((subjectId: string) => ({
            teacherId: data.id!,
            subjectId: parseInt(subjectId),
          })),
          skipDuplicates: true,
        });
      }
    }
    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Delete user in Supabase Auth
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        id
      );

      if (authError) {
        console.error("Error deleting Supabase auth user:", authError);
      }
    } catch (authError) {
      console.error("Error deleting Supabase auth user:", authError);
    }

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  console.log(data);
  try {
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    let userId = `temp-student-${Date.now()}`;

    try {
      if (supabaseClient && supabaseClient.auth) {
        const { data: userData, error: userError } =
          await supabaseClient.auth.admin.createUser({
            email: data.email || `${data.username}@example.com`,
            password: data.password,
            user_metadata: {
              role: "student",
              username: data.username,
              name: data.name,
            },
            email_confirm: true,
          });
        userId = userData.user?.id ?? userId;
      } else {
        console.log(
          "Supabase not properly configured, skipping auth user creation"
        );
      }
    } catch (supabaseError) {
      console.log("Error creating Supabase user:", supabaseError);
    }

    await prisma.student.create({
      data: {
        id: userId,
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        img: data.img || "",
        schoolLevel: 1,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    try {
      if (supabaseClient && supabaseClient.auth) {
        await supabaseClient.auth.admin.updateUserById(data.id, {
          user_metadata: {
            ...(data.password !== "" && { password: data.password }),
            username: data.username,
            name: data.name,
          },
        });
      } else {
        console.log(
          "Supabase not properly configured, skipping auth user update"
        );
      }
    } catch (supabaseError) {
      console.log("Error updating Supabase user:", supabaseError);
    }

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        img: data.img || "",
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    try {
      if (supabaseClient && supabaseClient.auth) {
        await supabaseClient.auth.admin.deleteUser(id);
      } else {
        console.log(
          "Supabase not properly configured, skipping auth user deletion"
        );
      }
    } catch (supabaseError) {
      console.log("Error deleting Supabase user:", supabaseError);
    }

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
